import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNEXPECTED_DATA_CODE } from '../api/errors'
import { getPlayerBySlug, getPlayerRecords, getPlayers, isPlayerRecordSort } from '../api/players'
import { getRecentRecords } from '../api/records'
import { PLAYER_ID, playerRow, postgrestError, recordRow } from './api-fixtures'
import { callsOf, fakeSupabase, methodsOf } from './fake-supabase'

vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})

beforeEach(() => {
  fakeSupabase.reset()
})

describe('getPlayers', () => {
  it('reads one page of players_view by rank (unranked last), then name and id', async () => {
    fakeSupabase.queue({ data: [playerRow(), playerRow({ rank: null, completions: 0 })], count: 6 })

    const result = await getPlayers({ page: 2, pageSize: 10 })

    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('players_view')
    expect(callsOf(query, 'select')).toEqual([['*', { count: 'exact' }]])
    expect(callsOf(query, 'order')).toEqual([
      ['rank', { ascending: true, nullsFirst: false }],
      ['name', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(callsOf(query, 'range')).toEqual([[10, 19]])
    expect(methodsOf(query)).not.toContain('ilike')
    expect(result.total).toBe(6)
    expect(result.rows.map((player) => player.rank)).toEqual([1, null])
  })

  it('defaults to page 1 of 25', async () => {
    await getPlayers()
    expect(callsOf(fakeSupabase.onlyQuery(), 'range')).toEqual([[0, 24]])
  })

  it('searches names with an escaped ILIKE pattern', async () => {
    await getPlayers({ search: 'al*pha' })
    expect(callsOf(fakeSupabase.onlyQuery(), 'ilike')).toEqual([['name', '%al_pha%']])
  })

  it('a page past the end is empty, with the real total', async () => {
    fakeSupabase.queue({
      error: postgrestError(
        'PGRST103',
        'Requested range not satisfiable',
        'An offset of 25 was requested, but there are only 6 rows.',
      ),
      status: 416,
    })
    await expect(getPlayers({ page: 2 })).resolves.toEqual({ rows: [], total: 6 })
  })

  it('throws an ApiError when a never-null counter is null', async () => {
    fakeSupabase.queue({ data: [playerRow({ total_points: null })], count: 1 })
    await expect(getPlayers()).rejects.toMatchObject({ code: UNEXPECTED_DATA_CODE })
  })
})

describe('getPlayerBySlug', () => {
  it('reads the player by slug', async () => {
    fakeSupabase.queue({ data: playerRow() })
    const player = await getPlayerBySlug('player-alpha')
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('players_view')
    expect(callsOf(query, 'eq')).toEqual([['slug', 'player-alpha']])
    expect(methodsOf(query)).toContain('maybeSingle')
    expect(player?.name).toBe('Player Alpha')
  })

  it('returns null when missing, and for invalid slugs without a request', async () => {
    fakeSupabase.queue({ data: null })
    await expect(getPlayerBySlug('player-zeta')).resolves.toBeNull()
    expect(fakeSupabase.queries).toHaveLength(1)

    await expect(getPlayerBySlug('Player Alpha')).resolves.toBeNull()
    expect(fakeSupabase.queries).toHaveLength(1)
  })
})

describe('getPlayerRecords', () => {
  it('reads records_view for the player, hardest level first by default', async () => {
    fakeSupabase.queue({ data: [recordRow()] })
    const records = await getPlayerRecords(PLAYER_ID)
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('records_view')
    expect(callsOf(query, 'eq')).toEqual([['player_id', PLAYER_ID]])
    expect(callsOf(query, 'order')).toEqual([
      ['level_position', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(records[0]).toMatchObject({ level_section: 'main', level_difficulty: 'extreme_demon' })
  })

  it('can sort by date beaten, newest first (unknown dates last)', async () => {
    await getPlayerRecords(PLAYER_ID, { sort: 'date' })
    expect(callsOf(fakeSupabase.onlyQuery(), 'order')).toEqual([
      ['date_beaten', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ])
  })

  it('returns [] for a malformed id without a request', async () => {
    await expect(getPlayerRecords('')).resolves.toEqual([])
    expect(fakeSupabase.queries).toHaveLength(0)
  })

  it('throws an ApiError for an unknown section', async () => {
    fakeSupabase.queue({ data: [recordRow({ level_section: 'bonus' })] })
    await expect(getPlayerRecords(PLAYER_ID)).rejects.toMatchObject({
      code: UNEXPECTED_DATA_CODE,
    })
  })

  it('isPlayerRecordSort', () => {
    expect(isPlayerRecordSort('date')).toBe(true)
    expect(isPlayerRecordSort('position')).toBe(true)
    expect(isPlayerRecordSort('points')).toBe(false)
  })
})

describe('getRecentRecords', () => {
  it('reads the latest completions: date beaten desc (undated last), created_at, id', async () => {
    fakeSupabase.queue({ data: [recordRow()] })
    const records = await getRecentRecords(5)
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('records_view')
    expect(callsOf(query, 'order')).toEqual([
      ['date_beaten', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(callsOf(query, 'limit')).toEqual([[5]])
    expect(records).toHaveLength(1)
  })

  it.each([
    [undefined, 5],
    [0, 1],
    [500, 50],
    [Number.NaN, 5],
    [7.9, 7],
  ])('limit %s → %s', async (limit, expected) => {
    await getRecentRecords(limit)
    expect(callsOf(fakeSupabase.onlyQuery(), 'limit')).toEqual([[expected]])
  })

  it('passes the signal on', async () => {
    const controller = new AbortController()
    await getRecentRecords(5, { signal: controller.signal })
    expect(callsOf(fakeSupabase.onlyQuery(), 'abortSignal')).toEqual([[controller.signal]])
  })
})
