import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNEXPECTED_DATA_CODE } from '../api/errors'
import { searchSite } from '../api/search'
import { DEFAULT_SITE_SETTINGS, getSettings } from '../api/settings'
import { pointsSettingsFromRow } from '../lib/points'
import { PLAYER_ID, postgrestError, searchRow } from './api-fixtures'
import { callsOf, fakeSupabase, methodsOf } from './fake-supabase'

vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})

beforeEach(() => {
  fakeSupabase.reset()
})

describe('searchSite', () => {
  it('calls search_site with the normalised (not escaped) text', async () => {
    fakeSupabase.queue({
      data: [
        searchRow(),
        // search_site sends null for a player's position, although the generated type says number.
        searchRow({
          kind: 'player',
          id: PLAYER_ID,
          name: 'Player Alpha',
          slug: 'player-alpha',
          position: null as unknown as number,
        }),
      ],
    })

    const results = await searchSite('  50%_off\tlevel  ')

    const query = fakeSupabase.onlyQuery()
    expect(query).toMatchObject({ kind: 'rpc', target: 'search_site' })
    expect(query.rpcArgs).toEqual({ q: '50%_off level' })
    expect(results).toEqual([
      {
        kind: 'level',
        id: searchRow().id,
        name: 'Sample Level 1',
        slug: 'sample-level-1',
        position: 1,
      },
      { kind: 'player', id: PLAYER_ID, name: 'Player Alpha', slug: 'player-alpha', position: null },
    ])
  })

  it.each(['', ' ', 'a', '  b  ', '\n'])('%j → [] without a request', async (q) => {
    await expect(searchSite(q)).resolves.toEqual([])
    expect(fakeSupabase.queries).toHaveLength(0)
  })

  it('cuts very long text to 100 characters', async () => {
    await searchSite('x'.repeat(250))
    expect(fakeSupabase.onlyQuery().rpcArgs).toEqual({ q: 'x'.repeat(100) })
  })

  it('passes the signal on', async () => {
    const controller = new AbortController()
    await searchSite('sample', { signal: controller.signal })
    expect(callsOf(fakeSupabase.onlyQuery(), 'abortSignal')).toEqual([[controller.signal]])
  })

  it('throws an ApiError for a level without a position or an unknown kind', async () => {
    fakeSupabase.queue({ data: [searchRow({ position: null as unknown as number })] })
    await expect(searchSite('sample')).rejects.toMatchObject({ code: UNEXPECTED_DATA_CODE })

    fakeSupabase.queue({ data: [searchRow({ kind: 'creator' })] })
    await expect(searchSite('sample')).rejects.toMatchObject({ code: UNEXPECTED_DATA_CODE })
  })

  it('reports a cancelled search as an aborted ApiError', async () => {
    fakeSupabase.queue({
      error: {
        message: 'AbortError: This operation was aborted',
        details: '',
        hint: 'Request was aborted (timeout or manual cancellation)',
        code: '',
      },
      status: 0,
    })
    await expect(searchSite('sample')).rejects.toMatchObject({ kind: 'network', code: 'aborted' })
  })
})

describe('getSettings', () => {
  const row = {
    id: 1,
    site_name: 'Qwerty Crate',
    main_list_size: 10,
    extended_list_size: 5,
    points_max: 300,
    points_decay: 0.9,
    points_min: 2,
    updated_at: '2026-10-07T14:02:00+00:00',
  }

  it('reads the single site_settings row', async () => {
    fakeSupabase.queue({ data: row })
    const settings = await getSettings()
    const query = fakeSupabase.onlyQuery()
    expect(query.target).toBe('site_settings')
    expect(callsOf(query, 'eq')).toEqual([['id', 1]])
    expect(methodsOf(query)).toContain('maybeSingle')
    expect(settings).toEqual(row)
    expect(pointsSettingsFromRow(settings)).toEqual({
      mainListSize: 10,
      extendedListSize: 5,
      pointsMax: 300,
      pointsDecay: 0.9,
      pointsMin: 2,
    })
  })

  it('falls back to the defaults when the row is missing (like the SQL)', async () => {
    fakeSupabase.queue({ data: null })
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_SITE_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SITE_SETTINGS)
    expect(settings).toMatchObject({ main_list_size: 25, extended_list_size: 25, points_max: 250 })
  })

  it('throws an ApiError on failure', async () => {
    fakeSupabase.queue({ error: postgrestError('PGRST002', 'schema cache'), status: 503 })
    await expect(getSettings()).rejects.toMatchObject({ name: 'ApiError', kind: 'network' })
  })
})
