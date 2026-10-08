import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_MESSAGE } from '../api/errors'
import {
  getAdjacentLevels,
  getLevelBySlug,
  getLevelHistory,
  getLevelRecords,
  getLevels,
} from '../api/levels'
import { toCompletion, toLevel, toSearchResult } from '../api/mappers'
import { getPlayerRecords } from '../api/players'
import { getRecentChanges } from '../api/recent'
import { getRecentRecords } from '../api/records'
import { searchSite } from '../api/search'
import { DEFAULT_SITE_SETTINGS, getSettings } from '../api/settings'
import { useAdjacentLevels, useLevel, useLevelHistory, useLevelRecords } from '../hooks/useLevel'
import { useLevels } from '../hooks/useLevels'
import { usePlayerRecords } from '../hooks/usePlayer'
import { useRecentChanges } from '../hooks/useRecentChanges'
import { useRecentRecords } from '../hooks/useRecentRecords'
import { useSearch } from '../hooks/useSearch'
import { usePointsSettings, useSettings } from '../hooks/useSettings'
import { DEFAULT_POINTS_SETTINGS } from '../lib/points'
import type { Completion, Level, Page, SiteSettings } from '../types/models'
import { LEVEL_ID, OTHER_LEVEL_ID, PLAYER_ID, levelRow, recordRow, searchRow } from './api-fixtures'

// No network: the API functions the hooks call are replaced with mocks (the rest of each
// module, e.g. LEVEL_SORTS, stays real). The real modules still import the Supabase client,
// so that is swapped for the fake too, which keeps the real environment out of it.
vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fake-supabase')
  return { supabase: fakeSupabase.client }
})
vi.mock('../api/levels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/levels')>()),
  getLevels: vi.fn(),
  getLevelBySlug: vi.fn(),
  getLevelRecords: vi.fn(),
  getLevelHistory: vi.fn(),
  getAdjacentLevels: vi.fn(),
}))
vi.mock('../api/players', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/players')>()),
  getPlayerRecords: vi.fn(),
}))
vi.mock('../api/recent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/recent')>()),
  getRecentChanges: vi.fn(),
}))
vi.mock('../api/records', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/records')>()),
  getRecentRecords: vi.fn(),
}))
vi.mock('../api/search', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/search')>()),
  searchSite: vi.fn(),
}))
vi.mock('../api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/settings')>()),
  getSettings: vi.fn(),
}))

const LEVEL: Level = toLevel(levelRow())
const OTHER_LEVEL: Level = toLevel(
  levelRow({ id: OTHER_LEVEL_ID, position: 2, name: 'Sample Level 2', slug: 'sample-level-2' }),
)
const RECORD: Completion = toCompletion(recordRow())
const RESULTS = [toSearchResult(searchRow())]
const OTHER_PLAYER_ID = '66666666-6666-4666-8666-666666666666'
const SIGNAL = { signal: expect.any(AbortSignal) as AbortSignal }

function page<T>(rows: T[], total = rows.length): Page<T> {
  return { rows, total }
}

/** A promise the test resolves (or rejects) when it wants to. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let client: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.resetAllMocks()
  // Retries off so a failing query reports its error straight away.
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
})

describe('useLevels', () => {
  it('asks the API for the normalised parameters and passes the AbortSignal', async () => {
    vi.mocked(getLevels).mockResolvedValue(page([LEVEL]))

    const { result } = renderHook(() => useLevels({ section: 'main', search: '  sample  ' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(page([LEVEL]))
    expect(getLevels).toHaveBeenCalledTimes(1)
    expect(getLevels).toHaveBeenCalledWith(
      { section: 'main', search: 'sample', sort: 'position', page: 1, pageSize: 25 },
      SIGNAL,
    )
  })

  it('makes one request for equivalent parameters', async () => {
    vi.mocked(getLevels).mockResolvedValue(page([LEVEL]))

    const { result } = renderHook(
      () => [useLevels(), useLevels({ page: 1, pageSize: 25, sort: 'position', search: 'x' })],
      { wrapper },
    )

    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true))
    expect(getLevels).toHaveBeenCalledTimes(1)
  })

  it('keeps the previous page on screen while the next one loads', async () => {
    const second = deferred<Page<Level>>()
    vi.mocked(getLevels).mockImplementation((params) =>
      params?.page === 2 ? second.promise : Promise.resolve(page([LEVEL], 2)),
    )

    const { result, rerender } = renderHook(({ pageNumber }) => useLevels({ page: pageNumber }), {
      wrapper,
      initialProps: { pageNumber: 1 },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ pageNumber: 2 })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.rows).toEqual([LEVEL])

    second.resolve(page([OTHER_LEVEL], 2))
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.rows).toEqual([OTHER_LEVEL])
  })

  it('cancels the request when the page using it goes away', async () => {
    let signal: AbortSignal | undefined
    vi.mocked(getLevels).mockImplementation((_params, options) => {
      signal = options?.signal
      return new Promise(() => {})
    })

    const { unmount } = renderHook(() => useLevels(), { wrapper })
    await waitFor(() => expect(signal).toBeInstanceOf(AbortSignal))
    expect(signal?.aborted).toBe(false)

    unmount()
    expect(signal?.aborted).toBe(true)
  })
})

describe('useLevel and the queries that depend on it', () => {
  it('loads a level by slug; null means not found', async () => {
    vi.mocked(getLevelBySlug).mockResolvedValue(null)

    const { result } = renderHook(() => useLevel('no-such-level'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(getLevelBySlug).toHaveBeenCalledWith('no-such-level', SIGNAL)
  })

  it('does nothing while the slug is unknown', () => {
    const { result } = renderHook(() => useLevel(undefined), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
    expect(getLevelBySlug).not.toHaveBeenCalled()
  })

  it('reports the ApiError the API throws', async () => {
    const error = new ApiError({ kind: 'network', code: 'network', message: NETWORK_MESSAGE })
    vi.mocked(getLevelBySlug).mockRejectedValue(error)

    const { result } = renderHook(() => useLevel('sample-level-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(result.current.error?.kind).toBe('network')
  })

  it('waits for the level id before loading records and history', async () => {
    vi.mocked(getLevelRecords).mockResolvedValue([RECORD])
    vi.mocked(getLevelHistory).mockResolvedValue([])

    const noId: { id: string | undefined } = { id: undefined }
    const { result, rerender } = renderHook(
      ({ id }) => ({ records: useLevelRecords(id), history: useLevelHistory(id) }),
      { wrapper, initialProps: noId },
    )

    expect(result.current.records.fetchStatus).toBe('idle')
    expect(result.current.history.fetchStatus).toBe('idle')
    expect(getLevelRecords).not.toHaveBeenCalled()
    expect(getLevelHistory).not.toHaveBeenCalled()

    rerender({ id: LEVEL_ID })
    await waitFor(() => expect(result.current.records.isSuccess).toBe(true))
    await waitFor(() => expect(result.current.history.isSuccess).toBe(true))
    expect(result.current.records.data).toEqual([RECORD])
    expect(getLevelRecords).toHaveBeenCalledWith(LEVEL_ID, SIGNAL)
    expect(getLevelHistory).toHaveBeenCalledWith(LEVEL_ID, SIGNAL)
  })

  it('only asks for neighbours of a real position', async () => {
    vi.mocked(getAdjacentLevels).mockResolvedValue({ prev: null, next: null })

    const noPosition: { position: number | undefined } = { position: undefined }
    const { result, rerender } = renderHook(({ position }) => useAdjacentLevels(position), {
      wrapper,
      initialProps: noPosition,
    })
    for (const position of [0, -1, 1.5, Number.NaN]) rerender({ position })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getAdjacentLevels).not.toHaveBeenCalled()

    rerender({ position: 3 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getAdjacentLevels).toHaveBeenCalledWith(3, SIGNAL)
  })
})

describe('usePlayerRecords', () => {
  it('keeps the old rows while only the sort changes, but never for another player', async () => {
    const byDate = deferred<Completion[]>()
    const otherPlayer = deferred<Completion[]>()
    vi.mocked(getPlayerRecords).mockImplementation((playerId, options) => {
      if (playerId === OTHER_PLAYER_ID) return otherPlayer.promise
      return options?.sort === 'date' ? byDate.promise : Promise.resolve([RECORD])
    })

    const { result, rerender } = renderHook(
      ({ id, sort }: { id: string; sort: 'position' | 'date' }) => usePlayerRecords(id, sort),
      { wrapper, initialProps: { id: PLAYER_ID, sort: 'position' } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getPlayerRecords).toHaveBeenLastCalledWith(PLAYER_ID, {
      sort: 'position',
      ...SIGNAL,
    })

    rerender({ id: PLAYER_ID, sort: 'date' })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data).toEqual([RECORD])
    byDate.resolve([RECORD])
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))

    rerender({ id: OTHER_PLAYER_ID, sort: 'date' })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.isPlaceholderData).toBe(false)
    expect(result.current.data).toBeUndefined()
    otherPlayer.resolve([])
    await waitFor(() => expect(result.current.data).toEqual([]))
  })
})

describe('useSearch', () => {
  it('does not search until there are 2 real characters', () => {
    const { result, rerender } = renderHook(({ q }) => useSearch(q), {
      wrapper,
      initialProps: { q: '' },
    })
    for (const q of [' ', 'a', '  b  ', '\n']) rerender({ q })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
    expect(searchSite).not.toHaveBeenCalled()
  })

  it('searches for the cleaned-up text and shares results for the same text', async () => {
    vi.mocked(searchSite).mockResolvedValue(RESULTS)

    const { result } = renderHook(() => [useSearch('  sample '), useSearch('sample')], {
      wrapper,
    })

    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true))
    expect(result.current[0]?.data).toEqual(RESULTS)
    expect(searchSite).toHaveBeenCalledTimes(1)
    expect(searchSite).toHaveBeenCalledWith('sample', SIGNAL)
  })

  it('keeps results while typing on, and drops them when the box is cleared', async () => {
    const longer = deferred<typeof RESULTS>()
    vi.mocked(searchSite).mockImplementation((q) =>
      q === 'sam' ? Promise.resolve(RESULTS) : longer.promise,
    )

    const { result, rerender } = renderHook(({ q }) => useSearch(q), {
      wrapper,
      initialProps: { q: 'sam' },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ q: 'samp' })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data).toEqual(RESULTS)

    rerender({ q: '' })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPlaceholderData).toBe(false)
  })
})

describe('usePointsSettings', () => {
  const ROW: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    main_list_size: 10,
    extended_list_size: 5,
    points_max: 100,
    points_decay: 0.9,
    points_min: 1,
  }

  it('returns the defaults while loading, then the real settings', async () => {
    const settings = deferred<SiteSettings>()
    vi.mocked(getSettings).mockReturnValue(settings.promise)

    const { result } = renderHook(() => usePointsSettings(), { wrapper })
    expect(result.current).toEqual(DEFAULT_POINTS_SETTINGS)

    settings.resolve(ROW)
    await waitFor(() =>
      expect(result.current).toEqual({
        mainListSize: 10,
        extendedListSize: 5,
        pointsMax: 100,
        pointsDecay: 0.9,
        pointsMin: 1,
      }),
    )
    expect(getSettings).toHaveBeenCalledWith(SIGNAL)
  })

  it('falls back to the defaults when the settings cannot be loaded', async () => {
    vi.mocked(getSettings).mockRejectedValue(
      new ApiError({ kind: 'network', message: NETWORK_MESSAGE }),
    )

    const { result } = renderHook(() => ({ points: usePointsSettings(), row: useSettings() }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.row.isError).toBe(true))
    expect(result.current.points).toEqual(DEFAULT_POINTS_SETTINGS)
  })

  it('shares one request with useSettings', async () => {
    vi.mocked(getSettings).mockResolvedValue(ROW)

    const { result } = renderHook(() => ({ points: usePointsSettings(), row: useSettings() }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.row.data).toEqual(ROW))
    expect(result.current.points.mainListSize).toBe(10)
    expect(getSettings).toHaveBeenCalledTimes(1)
  })
})

describe('feeds', () => {
  it('useRecentChanges asks for 30 per page by default', async () => {
    vi.mocked(getRecentChanges).mockResolvedValue(page([]))

    const { result } = renderHook(() => useRecentChanges({ kind: 'level_moved' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRecentChanges).toHaveBeenCalledWith(
      { kind: 'level_moved', page: 1, pageSize: 30 },
      SIGNAL,
    )
  })

  it('useRecentRecords asks for 5 by default and never more than 50', async () => {
    vi.mocked(getRecentRecords).mockResolvedValue([RECORD])

    const { result } = renderHook(() => [useRecentRecords(), useRecentRecords(500)], { wrapper })

    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true))
    expect(
      vi
        .mocked(getRecentRecords)
        .mock.calls.map(([limit]) => limit)
        .sort(),
    ).toEqual([5, 50])
  })
})
