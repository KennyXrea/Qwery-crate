import { hashKey, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  normalizeLevelsParams,
  normalizePlayersParams,
  normalizeRecentChangesParams,
  normalizeRecentRecordsLimit,
  queryKeys,
} from '../hooks/queryKeys'
import { LEVEL_ID, PLAYER_ID } from './api-fixtures'

// queryKeys imports constants from src/api, which loads the Supabase client: replace it with
// the fake so nothing reads the real environment or touches the network.
vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})

/** True when React Query treats the two keys as the same cache entry. */
function sameEntry(a: readonly unknown[], b: readonly unknown[]): boolean {
  return hashKey(a) === hashKey(b)
}

describe('normalizeLevelsParams', () => {
  it('fills in the API defaults', () => {
    expect(normalizeLevelsParams()).toEqual({ sort: 'position', page: 1, pageSize: 25 })
    expect(normalizeLevelsParams({})).toEqual({ sort: 'position', page: 1, pageSize: 25 })
  })

  it('keeps every filter that is set and leaves out the ones that are not', () => {
    expect(
      normalizeLevelsParams({
        section: 'extended',
        search: 'Sample',
        difficulty: 'hard_demon',
        playerId: PLAYER_ID,
        sort: 'enjoyment',
        page: 3,
        pageSize: 10,
      }),
    ).toEqual({
      section: 'extended',
      search: 'Sample',
      difficulty: 'hard_demon',
      playerId: PLAYER_ID,
      sort: 'enjoyment',
      page: 3,
      pageSize: 10,
    })
    const normalized = normalizeLevelsParams({
      section: undefined,
      search: undefined,
      difficulty: undefined,
      playerId: undefined,
    })
    expect(Object.keys(normalized).sort()).toEqual(['page', 'pageSize', 'sort'])
  })

  it('cleans up search text like the API and drops it when it is too short', () => {
    expect(normalizeLevelsParams({ search: '  sample \t level ' }).search).toBe('sample level')
    for (const search of ['', ' ', 'a', '  b  ']) {
      expect(normalizeLevelsParams({ search })).not.toHaveProperty('search')
    }
    expect(normalizeLevelsParams({ search: 'x'.repeat(250) }).search).toBe('x'.repeat(100))
  })

  it('clamps page and page size like the API', () => {
    expect(normalizeLevelsParams({ page: 0, pageSize: 0 })).toMatchObject({ page: 1, pageSize: 1 })
    expect(normalizeLevelsParams({ page: -4, pageSize: 1000 })).toMatchObject({
      page: 1,
      pageSize: 100,
    })
    expect(normalizeLevelsParams({ page: 2.9, pageSize: 10.5 })).toMatchObject({
      page: 2,
      pageSize: 10,
    })
    expect(normalizeLevelsParams({ page: Number.NaN, pageSize: Infinity })).toMatchObject({
      page: 1,
      pageSize: 25,
    })
    expect(normalizeLevelsParams({ page: 1e9 }).page).toBe(10_000)
  })

  it('turns an unknown sort into position (what the API does)', () => {
    // e.g. a hand-edited ?sort= value that slipped through.
    const sort = 'bogus' as unknown as 'points'
    expect(normalizeLevelsParams({ sort }).sort).toBe('position')
  })

  it('lower-cases the player id (Postgres compares ids without case)', () => {
    expect(normalizeLevelsParams({ playerId: PLAYER_ID.toUpperCase() }).playerId).toBe(PLAYER_ID)
  })

  it('drops filters the API ignores: a blank player id and unknown section / difficulty', () => {
    // ?player= (empty) is how the list URL looks without a player filter.
    for (const playerId of ['', '   ']) {
      expect(normalizeLevelsParams({ playerId })).not.toHaveProperty('playerId')
    }
    expect(normalizeLevelsParams({ playerId: ` ${PLAYER_ID} ` }).playerId).toBe(PLAYER_ID)
    const unknown = normalizeLevelsParams({
      section: 'bogus' as never,
      difficulty: 'extrem_demon' as never,
    })
    expect(Object.keys(unknown).sort()).toEqual(['page', 'pageSize', 'sort'])
    expect(sameEntry(queryKeys.levels.list({ playerId: '' }), queryKeys.levels.list())).toBe(true)
  })

  it('gives the same result when run twice', () => {
    const inputs = [
      {},
      { search: '  a  b ', page: 0, pageSize: 500, sort: 'points' as const },
      {
        section: 'legacy' as const,
        playerId: PLAYER_ID.toUpperCase(),
        difficulty: 'easy' as const,
      },
    ]
    for (const input of inputs) {
      const once = normalizeLevelsParams(input)
      expect(normalizeLevelsParams(once)).toEqual(once)
    }
  })
})

describe('other list normalisers', () => {
  it('players: defaults, clamps and search', () => {
    expect(normalizePlayersParams()).toEqual({ page: 1, pageSize: 25 })
    expect(normalizePlayersParams({ search: ' alpha ', page: 0, pageSize: 999 })).toEqual({
      search: 'alpha',
      page: 1,
      pageSize: 100,
    })
    expect(normalizePlayersParams({ search: 'a' })).toEqual({ page: 1, pageSize: 25 })
  })

  it('recent changes: 30 per page by default, kind kept when set', () => {
    expect(normalizeRecentChangesParams()).toEqual({ page: 1, pageSize: 30 })
    expect(normalizeRecentChangesParams({ kind: 'record', page: 2 })).toEqual({
      kind: 'record',
      page: 2,
      pageSize: 30,
    })
    expect(normalizeRecentChangesParams({ kind: undefined })).not.toHaveProperty('kind')
    // An unknown kind is ignored by the API, so it must not make a separate cache entry.
    expect(normalizeRecentChangesParams({ kind: 'moves' as never })).not.toHaveProperty('kind')
  })

  it('recent records: 5 by default, kept between 1 and 50', () => {
    expect(normalizeRecentRecordsLimit()).toBe(5)
    expect(normalizeRecentRecordsLimit(0)).toBe(1)
    expect(normalizeRecentRecordsLimit(12)).toBe(12)
    expect(normalizeRecentRecordsLimit(500)).toBe(50)
    expect(normalizeRecentRecordsLimit(Number.NaN)).toBe(5)
  })
})

describe('queryKeys', () => {
  it('gives equivalent list parameters the same cache entry', () => {
    const pairs: [readonly unknown[], readonly unknown[]][] = [
      [queryKeys.levels.list(), queryKeys.levels.list({})],
      [queryKeys.levels.list({}), queryKeys.levels.list({ page: 1, sort: 'position' })],
      [queryKeys.levels.list({ pageSize: 25 }), queryKeys.levels.list({ section: undefined })],
      [queryKeys.levels.list({ search: 'a' }), queryKeys.levels.list()],
      [
        queryKeys.levels.list({ search: '  sample  level', section: 'main' }),
        queryKeys.levels.list({ section: 'main', search: 'sample level' }),
      ],
      [queryKeys.players.list(), queryKeys.players.list({ page: 1, pageSize: 25, search: ' ' })],
      [queryKeys.recent.list(), queryKeys.recent.list({ page: 1, pageSize: 30 })],
      [queryKeys.recentRecords(), queryKeys.recentRecords(5)],
      [queryKeys.recentRecords(80), queryKeys.recentRecords(50)],
      [queryKeys.search('  sample '), queryKeys.search('sample')],
      [queryKeys.search('a'), queryKeys.search('')],
      [queryKeys.players.records(PLAYER_ID), queryKeys.players.records(PLAYER_ID, 'position')],
    ]
    for (const [a, b] of pairs) {
      expect(sameEntry(a, b), `${hashKey(a)} vs ${hashKey(b)}`).toBe(true)
    }
  })

  it('keeps different requests apart', () => {
    const pairs: [readonly unknown[], readonly unknown[]][] = [
      [queryKeys.levels.list({ page: 1 }), queryKeys.levels.list({ page: 2 })],
      [queryKeys.levels.list({ section: 'main' }), queryKeys.levels.list({ section: 'legacy' })],
      [queryKeys.levels.list({ sort: 'points' }), queryKeys.levels.list()],
      [queryKeys.levels.list({ search: 'ab' }), queryKeys.levels.list()],
      [queryKeys.levels.list({ playerId: PLAYER_ID }), queryKeys.levels.list()],
      [queryKeys.levels.records(LEVEL_ID), queryKeys.levels.history(LEVEL_ID)],
      [queryKeys.levels.detail('sample-level-1'), queryKeys.players.detail('sample-level-1')],
      [queryKeys.players.records(PLAYER_ID, 'date'), queryKeys.players.records(PLAYER_ID)],
      [queryKeys.recent.list({ kind: 'record' }), queryKeys.recent.list()],
      [queryKeys.recentRecords(5), queryKeys.recentRecords(10)],
      [queryKeys.search('sample'), queryKeys.search('samples')],
    ]
    for (const [a, b] of pairs) {
      expect(sameEntry(a, b), `${hashKey(a)} vs ${hashKey(b)}`).toBe(false)
    }
  })

  it('stores the normalised parameters in the key', () => {
    expect(queryKeys.levels.list({ search: ' ab ' })).toEqual([
      'levels',
      'list',
      { sort: 'position', page: 1, pageSize: 25, search: 'ab' },
    ])
    expect(queryKeys.players.records(PLAYER_ID)).toEqual([
      'players',
      'records',
      PLAYER_ID,
      'position',
    ])
    expect(queryKeys.search('  two  words ')).toEqual(['search', 'two words'])
    expect(queryKeys.settings()).toEqual(['settings'])
    expect(queryKeys.stats()).toEqual(['stats'])
  })

  it('groups keys by area so a whole area can be refreshed at once', () => {
    const client = new QueryClient()
    const seed = (key: readonly unknown[]) => client.setQueryData(key, 'cached')
    seed(queryKeys.levels.list())
    seed(queryKeys.levels.list({ page: 2 }))
    seed(queryKeys.levels.detail('sample-level-1'))
    seed(queryKeys.levels.records(LEVEL_ID))
    seed(queryKeys.levels.history(LEVEL_ID))
    seed(queryKeys.levels.adjacent(1))
    seed(queryKeys.players.list())
    seed(queryKeys.players.detail('player-alpha'))
    seed(queryKeys.players.records(PLAYER_ID))
    seed(queryKeys.recent.list())
    seed(queryKeys.recentRecords())
    seed(queryKeys.settings())
    seed(queryKeys.stats())
    seed(queryKeys.search('sample'))

    const count = (queryKey: readonly unknown[]) =>
      client.getQueryCache().findAll({ queryKey }).length
    expect(count(queryKeys.levels.all())).toBe(6)
    expect(count(queryKeys.levels.lists())).toBe(2)
    expect(count(queryKeys.players.all())).toBe(3)
    expect(count(queryKeys.players.lists())).toBe(1)
    expect(count(queryKeys.recent.all())).toBe(2)
    expect(count(queryKeys.recent.lists())).toBe(1)
    expect(client.getQueryCache().getAll()).toHaveLength(14)
    client.clear()
  })
})
