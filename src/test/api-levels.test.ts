import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NOT_AUTHORIZED_MESSAGE, UNEXPECTED_DATA_CODE } from '../api/errors'
import {
  getAdjacentLevels,
  getLevelBySlug,
  getLevelHistory,
  getLevelRecords,
  getLevels,
  isLevelSort,
  LEVEL_SORTS,
} from '../api/levels'
import {
  historyRow,
  LEVEL_ID,
  levelRow,
  OTHER_LEVEL_ID,
  PLAYER_ID,
  postgrestError,
  recordRow,
} from './api-fixtures'
import { callsOf, fakeSupabase, methodsOf, type RecordedQuery } from './fake-supabase'

vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})

beforeEach(() => {
  fakeSupabase.reset()
})

const TIE_BREAK = [
  ['position', { ascending: true }],
  ['id', { ascending: true }],
]

describe('getLevels', () => {
  it('reads one page of levels_view with an exact count, sorted by position by default', async () => {
    fakeSupabase.queue({ data: [levelRow()], count: 12 })

    const result = await getLevels()

    const query = fakeSupabase.onlyQuery()
    expect(query).toMatchObject({ kind: 'from', target: 'levels_view' })
    expect(callsOf(query, 'select')).toEqual([['*', { count: 'exact' }]])
    expect(callsOf(query, 'order')).toEqual(TIE_BREAK)
    expect(callsOf(query, 'range')).toEqual([[0, 24]])
    // No filters were added.
    expect(methodsOf(query)).toEqual(['select', 'order', 'order', 'range'])
    expect(result.total).toBe(12)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ id: LEVEL_ID, section: 'main', points: 250 })
  })

  it('turns a 1-based page into a row range', async () => {
    await getLevels({ page: 3, pageSize: 10 })
    expect(callsOf(fakeSupabase.onlyQuery(), 'range')).toEqual([[20, 29]])
  })

  it.each([
    [{ page: 0 }, [0, 24]],
    [{ page: -5 }, [0, 24]],
    [{ page: Number.NaN }, [0, 24]],
    [{ page: 2.7 }, [25, 49]],
    [{ pageSize: 0 }, [0, 0]],
    [{ pageSize: 5000 }, [0, 99]],
    [{ page: 1e9, pageSize: 25 }, [249_975, 249_999]],
  ])('clamps paging %o → range %o', async (params, range) => {
    await getLevels(params)
    expect(callsOf(fakeSupabase.onlyQuery(), 'range')).toEqual([range])
  })

  it('applies section, search and difficulty filters', async () => {
    await getLevels({ section: 'extended', search: '  Sample   50%_ ', difficulty: 'hard_demon' })
    const query = fakeSupabase.onlyQuery()
    expect(callsOf(query, 'eq')).toEqual([
      ['section', 'extended'],
      ['difficulty', 'hard_demon'],
    ])
    // normalizeSearch tidied the spaces; escapeLike made % and _ literal.
    expect(callsOf(query, 'ilike')).toEqual([['name', '%Sample 50\\%\\_%']])
  })

  it('skips the search filter when the text is too short', async () => {
    await getLevels({ search: ' a ' })
    expect(callsOf(fakeSupabase.onlyQuery(), 'ilike')).toEqual([])
  })

  it.each([
    ['points', [['points', { ascending: false, nullsFirst: false }], ...TIE_BREAK]],
    ['enjoyment', [['avg_enjoyment', { ascending: false, nullsFirst: false }], ...TIE_BREAK]],
    ['attempts', [['avg_attempts', { ascending: false, nullsFirst: false }], ...TIE_BREAK]],
    ['victors', [['victor_count', { ascending: false, nullsFirst: false }], ...TIE_BREAK]],
    ['newest', [['created_at', { ascending: false, nullsFirst: false }], ...TIE_BREAK]],
    ['position', TIE_BREAK],
  ] as const)('sort %s orders by %o', async (sort, order) => {
    await getLevels({ sort })
    expect(callsOf(fakeSupabase.onlyQuery(), 'order')).toEqual(order)
  })

  it('falls back to position order for an unknown sort value', async () => {
    // e.g. a hand-edited ?sort= that slipped through without isLevelSort()
    await getLevels({ sort: 'banana' as never })
    expect(callsOf(fakeSupabase.onlyQuery(), 'order')).toEqual(TIE_BREAK)
  })

  it('filters by player in two steps: their level ids from records, then .in()', async () => {
    fakeSupabase.respond((query) =>
      query.target === 'records'
        ? { data: [{ level_id: LEVEL_ID }, { level_id: OTHER_LEVEL_ID }] }
        : { data: [levelRow()], count: 1 },
    )

    const result = await getLevels({ playerId: PLAYER_ID, difficulty: 'extreme_demon' })

    expect(fakeSupabase.queries.map((q) => q.target)).toEqual(['records', 'levels_view'])
    const [records, levels] = fakeSupabase.queries as [RecordedQuery, RecordedQuery]
    expect(callsOf(records, 'select')).toEqual([['level_id']])
    expect(callsOf(records, 'eq')).toEqual([['player_id', PLAYER_ID]])
    expect(callsOf(levels, 'in')).toEqual([['id', [LEVEL_ID, OTHER_LEVEL_ID]]])
    expect(callsOf(levels, 'eq')).toEqual([['difficulty', 'extreme_demon']])
    expect(result.total).toBe(1)
  })

  it('returns an empty page without reading levels when the player has no completions', async () => {
    fakeSupabase.queue({ data: [] })
    await expect(getLevels({ playerId: PLAYER_ID })).resolves.toEqual({ rows: [], total: 0 })
    expect(fakeSupabase.queries.map((q) => q.target)).toEqual(['records'])
  })

  it('returns an empty page without any request for a malformed player id', async () => {
    await expect(getLevels({ playerId: 'player-alpha' })).resolves.toEqual({ rows: [], total: 0 })
    expect(fakeSupabase.queries).toHaveLength(0)
  })

  it.each(['', '   '])(
    'treats a blank player id (%j, e.g. from ?player=) as no player filter',
    async (playerId) => {
      fakeSupabase.queue({ data: [levelRow()], count: 12 })
      const result = await getLevels({ playerId })
      const query = fakeSupabase.onlyQuery()
      expect(query.target).toBe('levels_view')
      expect(callsOf(query, 'in')).toEqual([])
      expect(result.total).toBe(12)
    },
  )

  it('ignores unknown section and difficulty values instead of failing (like unknown sorts)', async () => {
    // e.g. a hand-edited ?difficulty=extrem_demon that slipped through without isDifficulty():
    // Postgres would reject it (22P02, an error page whose Retry can never succeed).
    await getLevels({ section: 'bogus' as never, difficulty: 'extrem_demon' as never })
    expect(callsOf(fakeSupabase.onlyQuery(), 'eq')).toEqual([])
  })

  it('trims spaces around the player id', async () => {
    fakeSupabase.queue({ data: [{ level_id: LEVEL_ID }] }, { data: [levelRow()], count: 1 })
    await getLevels({ playerId: `  ${PLAYER_ID}  ` })
    const [records] = fakeSupabase.queries as [RecordedQuery]
    expect(callsOf(records, 'eq')).toEqual([['player_id', PLAYER_ID]])
  })

  it('a page past the end is an empty page with the real total (PGRST103)', async () => {
    fakeSupabase.queue({
      error: postgrestError(
        'PGRST103',
        'Requested range not satisfiable',
        'An offset of 100 was requested, but there are only 12 rows.',
      ),
      status: 416,
    })
    await expect(getLevels({ page: 5 })).resolves.toEqual({ rows: [], total: 12 })
  })

  it('attaches the AbortSignal to every request', async () => {
    const controller = new AbortController()
    fakeSupabase.respond((query) =>
      query.target === 'records' ? { data: [{ level_id: LEVEL_ID }] } : { data: [], count: 0 },
    )
    await getLevels({ playerId: PLAYER_ID }, { signal: controller.signal })
    for (const query of fakeSupabase.queries) {
      expect(callsOf(query, 'abortSignal')).toEqual([[controller.signal]])
    }
  })

  it('does not call abortSignal() without a signal', async () => {
    await getLevels()
    expect(callsOf(fakeSupabase.onlyQuery(), 'abortSignal')).toEqual([])
  })

  it('throws an ApiError with a friendly message when the request fails', async () => {
    fakeSupabase.queue({ error: postgrestError('42501', 'permission denied'), status: 401 })
    const error = await getLevels().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
  })

  it('throws an ApiError when a never-null column arrives null', async () => {
    fakeSupabase.queue({ data: [levelRow({ points: null })], count: 1 })
    await expect(getLevels()).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'unknown',
      code: UNEXPECTED_DATA_CODE,
    })
  })

  it('throws an ApiError when the fetch itself fails', async () => {
    fakeSupabase.queue({
      error: { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' },
      status: 0,
    })
    await expect(getLevels()).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('LEVEL_SORTS / isLevelSort', () => {
  it('lists the six sorts and recognises them', () => {
    expect(LEVEL_SORTS).toEqual([
      'position',
      'points',
      'enjoyment',
      'attempts',
      'victors',
      'newest',
    ])
    for (const sort of LEVEL_SORTS) expect(isLevelSort(sort)).toBe(true)
    expect(isLevelSort('rank')).toBe(false)
    expect(isLevelSort(undefined)).toBe(false)
  })
})

describe('getLevelBySlug', () => {
  it('reads the level by slug', async () => {
    fakeSupabase.queue({ data: levelRow() })
    const level = await getLevelBySlug('sample-level-1')
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('levels_view')
    expect(callsOf(query, 'eq')).toEqual([['slug', 'sample-level-1']])
    expect(methodsOf(query)).toContain('maybeSingle')
    expect(level).toMatchObject({ slug: 'sample-level-1', difficulty: 'extreme_demon' })
  })

  it('returns null when there is no such level', async () => {
    fakeSupabase.queue({ data: null })
    await expect(getLevelBySlug('no-such-level')).resolves.toBeNull()
  })

  it.each(['', 'Sample-Level', 'bad slug', '-x', 'a--b', '../etc', 'x'.repeat(5) + '_'])(
    'returns null for the invalid slug %j without asking the server',
    async (slug) => {
      await expect(getLevelBySlug(slug)).resolves.toBeNull()
      expect(fakeSupabase.queries).toHaveLength(0)
    },
  )

  it('attaches the signal before maybeSingle()', async () => {
    const controller = new AbortController()
    fakeSupabase.queue({ data: null })
    await getLevelBySlug('sample-level-1', { signal: controller.signal })
    const methods = methodsOf(fakeSupabase.onlyQuery())
    expect(methods.indexOf('abortSignal')).toBeLessThan(methods.indexOf('maybeSingle'))
  })
})

describe('getLevelRecords', () => {
  it('reads records_view for the level, first victor first', async () => {
    fakeSupabase.queue({ data: [recordRow(), recordRow({ is_first_victory: false })] })
    const records = await getLevelRecords(LEVEL_ID)
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('records_view')
    expect(callsOf(query, 'eq')).toEqual([['level_id', LEVEL_ID]])
    expect(callsOf(query, 'order')).toEqual([
      ['date_beaten', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(records).toHaveLength(2)
    expect(records[0]?.is_first_victory).toBe(true)
  })

  it('returns [] for a malformed id without a request', async () => {
    await expect(getLevelRecords('nope')).resolves.toEqual([])
    expect(fakeSupabase.queries).toHaveLength(0)
  })
})

describe('getLevelHistory', () => {
  it('reads the history newest first (changed_at, then seq)', async () => {
    fakeSupabase.queue({
      data: [historyRow(), historyRow({ reason: 'added', old_position: null })],
    })
    const history = await getLevelHistory(LEVEL_ID)
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('level_position_history')
    expect(callsOf(query, 'eq')).toEqual([['level_id', LEVEL_ID]])
    expect(callsOf(query, 'order')).toEqual([
      ['changed_at', { ascending: false }],
      ['seq', { ascending: false }],
    ])
    expect(history.map((entry) => entry.reason)).toEqual(['moved', 'added'])
  })

  it('throws an ApiError for an unknown reason', async () => {
    fakeSupabase.queue({ data: [historyRow({ reason: 'teleported' })] })
    await expect(getLevelHistory(LEVEL_ID)).rejects.toMatchObject({ code: UNEXPECTED_DATA_CODE })
  })
})

describe('getAdjacentLevels', () => {
  it('reads the levels at position − 1 and + 1 with minimal fields', async () => {
    fakeSupabase.queue({
      data: [
        { name: 'Sample Level 5', slug: 'sample-level-5', position: 5 },
        { name: 'Sample Level 3', slug: 'sample-level-3', position: 3 },
      ],
    })
    const result = await getAdjacentLevels(4)
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('levels')
    expect(callsOf(query, 'select')).toEqual([['name, slug, position']])
    expect(callsOf(query, 'in')).toEqual([['position', [3, 5]]])
    expect(result).toEqual({
      prev: { name: 'Sample Level 3', slug: 'sample-level-3', position: 3 },
      next: { name: 'Sample Level 5', slug: 'sample-level-5', position: 5 },
    })
  })

  it('#1 has no previous level; the last level has no next one', async () => {
    fakeSupabase.queue({ data: [] })
    await expect(getAdjacentLevels(1)).resolves.toEqual({ prev: null, next: null })
    expect(callsOf(fakeSupabase.onlyQuery(), 'in')).toEqual([['position', [2]]])
  })

  it.each([0, -1, 1.5, Number.NaN])('position %s → no request, no neighbours', async (position) => {
    await expect(getAdjacentLevels(position)).resolves.toEqual({ prev: null, next: null })
    expect(fakeSupabase.queries).toHaveLength(0)
  })
})
