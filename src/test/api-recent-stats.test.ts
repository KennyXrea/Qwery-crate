import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNEXPECTED_DATA_CODE } from '../api/errors'
import { getRecentChanges, isRecentChangeKind, RECENT_CHANGE_KINDS } from '../api/recent'
import {
  countCompletionsPerMonth,
  countDifficulties,
  getSiteStats,
  MAX_FILLED_MONTHS,
} from '../api/stats'
import { DIFFICULTIES } from '../lib/format'
import { levelRow, postgrestError, recentLevelRow, recentRecordRow } from './api-fixtures'
import { callsOf, fakeSupabase, type RecordedQuery } from './fake-supabase'

vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})

beforeEach(() => {
  fakeSupabase.reset()
})

describe('getRecentChanges', () => {
  it('reads 30 per page with the stable order event_date, happened_at, kind, id', async () => {
    fakeSupabase.queue({
      data: [
        recentRecordRow(),
        recentLevelRow(),
        recentLevelRow({ kind: 'level_added', old_position: null, new_position: 3 }),
      ],
      count: 41,
    })

    const result = await getRecentChanges({ page: 2 })

    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('recent_changes_view')
    expect(callsOf(query, 'select')).toEqual([['*', { count: 'exact' }]])
    expect(callsOf(query, 'eq')).toEqual([])
    expect(callsOf(query, 'order')).toEqual([
      ['event_date', { ascending: false }],
      ['happened_at', { ascending: false }],
      ['kind', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(callsOf(query, 'range')).toEqual([[30, 59]])
    expect(result.total).toBe(41)
    expect(result.rows.map((row) => row.kind)).toEqual(['record', 'level_moved', 'level_added'])

    // The union narrows by kind.
    const [record, moved, added] = result.rows
    if (record?.kind !== 'record') throw new Error('expected a record')
    expect(record.player_name).toBe('Player Alpha')
    if (moved?.kind !== 'level_moved') throw new Error('expected a move')
    expect([moved.old_position, moved.new_position]).toEqual([4, 1])
    if (added?.kind !== 'level_added') throw new Error('expected an addition')
    expect([added.old_position, added.new_position]).toEqual([null, 3])
  })

  it('filters by kind', async () => {
    await getRecentChanges({ kind: 'level_moved', pageSize: 10 })
    const query = fakeSupabase.onlyQuery()
    expect(callsOf(query, 'eq')).toEqual([['kind', 'level_moved']])
    expect(callsOf(query, 'range')).toEqual([[0, 9]])
  })

  it('ignores an unknown kind instead of filtering on it (e.g. a hand-edited ?kind=)', async () => {
    await getRecentChanges({ kind: 'moves' as never })
    expect(callsOf(fakeSupabase.onlyQuery(), 'eq')).toEqual([])
  })

  it.each([
    ['an unknown kind', recentRecordRow({ kind: 'level_deleted' })],
    ['a record without a player', recentRecordRow({ player_name: null })],
    ['a move without an old position', recentLevelRow({ old_position: null })],
    [
      'an addition without a new position',
      recentLevelRow({ kind: 'level_added', new_position: null }),
    ],
    ['a missing event date', recentRecordRow({ event_date: null })],
  ])('throws an ApiError for %s', async (_name, row) => {
    fakeSupabase.queue({ data: [row], count: 1 })
    await expect(getRecentChanges()).rejects.toMatchObject({ code: UNEXPECTED_DATA_CODE })
  })

  it('a page past the end is empty, with the real total', async () => {
    fakeSupabase.queue({
      error: postgrestError(
        'PGRST103',
        'Requested range not satisfiable',
        'An offset of 90 was requested, but there are only 41 rows.',
      ),
      status: 416,
    })
    await expect(getRecentChanges({ page: 4 })).resolves.toEqual({ rows: [], total: 41 })
  })

  it('RECENT_CHANGE_KINDS / isRecentChangeKind', () => {
    expect(RECENT_CHANGE_KINDS).toEqual(['record', 'level_added', 'level_moved'])
    expect(isRecentChangeKind('level_added')).toBe(true)
    expect(isRecentChangeKind('shifted')).toBe(false)
    expect(isRecentChangeKind('toString')).toBe(false)
  })
})

describe('countCompletionsPerMonth', () => {
  it('counts per month, oldest first, filling empty months with 0', () => {
    const result = countCompletionsPerMonth([
      '2026-03-15',
      '2025-12-01',
      null,
      '2026-03-01',
      '2025-12-31',
      '2026-01-20',
    ])
    expect(result).toEqual({
      months: [
        { month: '2025-12', count: 2 },
        { month: '2026-01', count: 1 },
        { month: '2026-02', count: 0 },
        { month: '2026-03', count: 2 },
      ],
      undated: 1,
    })
  })

  it('no dated completions → no months', () => {
    expect(countCompletionsPerMonth([null, null])).toEqual({ months: [], undated: 2 })
    expect(countCompletionsPerMonth([])).toEqual({ months: [], undated: 0 })
  })

  it('does not fill a huge gap caused by a typo year', () => {
    const { months } = countCompletionsPerMonth(['0202-05-01', '2026-01-05'])
    expect(months).toEqual([
      { month: '0202-05', count: 1 },
      { month: '2026-01', count: 1 },
    ])
    expect(MAX_FILLED_MONTHS).toBeGreaterThanOrEqual(120)
  })
})

describe('countDifficulties', () => {
  it('lists all 11 difficulties in DIFFICULTIES order, zeros included', () => {
    const result = countDifficulties(['extreme_demon', 'easy', 'extreme_demon'])
    expect(result.map((entry) => entry.difficulty)).toEqual([...DIFFICULTIES])
    expect(result.find((entry) => entry.difficulty === 'extreme_demon')?.count).toBe(2)
    expect(result.find((entry) => entry.difficulty === 'easy')?.count).toBe(1)
    expect(result.reduce((sum, entry) => sum + entry.count, 0)).toBe(3)
  })
})

describe('getSiteStats', () => {
  function isHead(query: RecordedQuery) {
    return callsOf(query, 'select').some(([, options]) => {
      return typeof options === 'object' && options !== null && 'head' in options
    })
  }

  beforeEach(() => {
    fakeSupabase.respond((query) => {
      if (isHead(query)) {
        const counts: Record<string, number> = { levels: 12, players: 6, records: 4 }
        return { data: null, count: counts[query.target] ?? 0 }
      }
      if (query.target === 'levels') {
        return {
          data: [{ difficulty: 'extreme_demon' }, { difficulty: 'insane_demon' }],
          count: 2,
        }
      }
      if (query.target === 'records') {
        return {
          data: [
            { attempts: 100, date_beaten: '2026-01-05' },
            { attempts: null, date_beaten: '2026-03-02' },
            { attempts: 50, date_beaten: null },
            { attempts: 7, date_beaten: '2026-01-31' },
          ],
          count: 4,
        }
      }
      return { data: [levelRow()] }
    })
  })

  it('combines counts, totals, distributions and top lists', async () => {
    const stats = await getSiteStats()

    expect(stats).toMatchObject({
      levels: 12,
      players: 6,
      records: 4,
      totalAttempts: 157,
      undatedCompletions: 1,
      completionsPerMonth: [
        { month: '2026-01', count: 2 },
        { month: '2026-02', count: 0 },
        { month: '2026-03', count: 1 },
      ],
    })
    expect(stats.difficultyDistribution).toHaveLength(11)
    expect(stats.difficultyDistribution.filter((entry) => entry.count > 0)).toEqual([
      { difficulty: 'insane_demon', count: 1 },
      { difficulty: 'extreme_demon', count: 1 },
    ])
    expect(stats.mostEnjoyed).toHaveLength(1)
    expect(stats.mostAttempts).toHaveLength(1)
  })

  it('uses count-only head requests for the three totals', async () => {
    await getSiteStats()
    const heads = fakeSupabase.queries.filter(isHead)
    expect(heads.map((query) => query.target).sort()).toEqual(['levels', 'players', 'records'])
    for (const query of heads) {
      expect(callsOf(query, 'select')).toEqual([['id', { count: 'exact', head: true }]])
    }
  })

  it('reads only the columns it needs, in chunks with a stable order', async () => {
    await getSiteStats()
    const scans = fakeSupabase.queries.filter(
      (query) => !isHead(query) && query.target !== 'levels_view',
    )
    expect(scans.map((query) => [query.target, callsOf(query, 'select')[0]?.[0]])).toEqual([
      ['levels', 'difficulty'],
      ['records', 'attempts, date_beaten'],
    ])
    for (const query of scans) {
      expect(callsOf(query, 'order')).toEqual([['id', { ascending: true }]])
      expect(callsOf(query, 'range')).toEqual([[0, 999]])
    }
  })

  it('top lists skip levels without a value and break ties by position', async () => {
    await getSiteStats()
    const tops = fakeSupabase.queries.filter((query) => query.target === 'levels_view')
    expect(tops.map((query) => callsOf(query, 'not'))).toEqual([
      [['avg_enjoyment', 'is', null]],
      [['avg_attempts', 'is', null]],
    ])
    expect(callsOf(tops[0] as RecordedQuery, 'order')).toEqual([
      ['avg_enjoyment', { ascending: false, nullsFirst: false }],
      ['position', { ascending: true }],
      ['id', { ascending: true }],
    ])
    for (const query of tops) expect(callsOf(query, 'limit')).toEqual([[5]])
  })

  it('reads more than 1000 rows in several chunks', async () => {
    const many = Array.from({ length: 1000 }, () => ({ attempts: 1, date_beaten: null }))
    fakeSupabase.respond((query) => {
      if (isHead(query)) return { data: null, count: 1500 }
      if (query.target === 'records') {
        const [from] = callsOf(query, 'range')[0] as [number, number]
        return { data: from === 0 ? many : many.slice(0, 500), count: 1500 }
      }
      return { data: [], count: 0 }
    })

    const stats = await getSiteStats()

    const recordScans = fakeSupabase.queries.filter(
      (query) => query.target === 'records' && !isHead(query),
    )
    expect(recordScans.map((query) => callsOf(query, 'range')[0])).toEqual([
      [0, 999],
      [1000, 1999],
    ])
    expect(stats.totalAttempts).toBe(1500)
    expect(stats.undatedCompletions).toBe(1500)
  })

  it('throws an ApiError if any part fails', async () => {
    fakeSupabase.respond((query) =>
      query.target === 'players'
        ? { error: postgrestError('', 'TypeError: Failed to fetch'), status: 0 }
        : { data: [], count: 0 },
    )
    await expect(getSiteStats()).rejects.toMatchObject({ name: 'ApiError', kind: 'network' })
  })
})
