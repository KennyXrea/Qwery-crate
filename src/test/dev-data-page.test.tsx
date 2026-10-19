import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_MESSAGE } from '../api/errors'
import {
  getAdjacentLevels,
  getLevelBySlug,
  getLevelHistory,
  getLevelRecords,
  getLevels,
} from '../api/levels'
import {
  toCompletion,
  toLevel,
  toPlayer,
  toPositionHistoryEntry,
  toRecentChange,
  toRecentRecordChange,
  toSearchResult,
} from '../api/mappers'
import { getPlayerBySlug, getPlayerRecords, getPlayers } from '../api/players'
import { getRecentChanges } from '../api/recent'
import { getRecentRecords } from '../api/records'
import { searchSite } from '../api/search'
import { DEFAULT_SITE_SETTINGS, getSettings } from '../api/settings'
import { countDifficulties, getSiteStats } from '../api/stats'
import { ToastProvider } from '../components/ui/ToastProvider'
import { routes } from '../routes'
import type { SiteStats } from '../types/models'
import {
  LEVEL_ID,
  PLAYER_ID,
  historyRow,
  levelRow,
  playerRow,
  recentRecordRow,
  recordRow,
  searchRow,
} from './api-fixtures'

// The temporary /dev/data page, rendered through the real route table with every API function
// it uses replaced by a mock: no network, no real environment.
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
  getPlayers: vi.fn(),
  getPlayerBySlug: vi.fn(),
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
vi.mock('../api/stats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/stats')>()),
  getSiteStats: vi.fn(),
}))

/** The page's code is lazily loaded, which takes a moment the first time. */
const LAZY_TIMEOUT = { timeout: 5000 }

const LEVEL = toLevel(levelRow())
const PLAYER = toPlayer(playerRow())
const RECORD = toCompletion(recordRow())
const STATS: SiteStats = {
  levels: 1,
  players: 1,
  records: 1,
  totalAttempts: 12000,
  difficultyDistribution: countDifficulties(['extreme_demon']),
  completionsPerMonth: [{ month: '2026-01', count: 1 }],
  undatedCompletions: 0,
  mostEnjoyed: [LEVEL],
  mostAttempts: [LEVEL],
}

beforeAll(() => {
  // jsdom doesn't implement scrolling; ScrollRestoration calls it on navigation.
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true, configurable: true })
})

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SITE_SETTINGS, main_list_size: 20 })
  vi.mocked(getLevels).mockResolvedValue({ rows: [LEVEL], total: 1 })
  vi.mocked(getLevelBySlug).mockResolvedValue(LEVEL)
  vi.mocked(getLevelRecords).mockResolvedValue([RECORD])
  vi.mocked(getLevelHistory).mockResolvedValue([toPositionHistoryEntry(historyRow())])
  vi.mocked(getAdjacentLevels).mockResolvedValue({
    prev: null,
    next: { name: 'Sample Level 2', slug: 'sample-level-2', position: 2 },
  })
  vi.mocked(getPlayers).mockResolvedValue({ rows: [PLAYER], total: 1 })
  vi.mocked(getPlayerBySlug).mockResolvedValue(PLAYER)
  vi.mocked(getPlayerRecords).mockResolvedValue([RECORD])
  vi.mocked(getRecentChanges).mockResolvedValue({
    rows: [toRecentChange(recentRecordRow())],
    total: 1,
  })
  vi.mocked(getRecentRecords).mockResolvedValue([toRecentRecordChange(recentRecordRow())])
  vi.mocked(getSiteStats).mockResolvedValue(STATS)
  vi.mocked(searchSite).mockResolvedValue([toSearchResult(searchRow())])
})

afterEach(() => {
  client.clear()
  document.title = ''
})

function renderDevData() {
  const router = createMemoryRouter(routes, { initialEntries: ['/dev/data'] })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

/** The card for one hook, found by its heading (e.g. "useSettings()"). */
function block(name: string) {
  return screen.getByRole('region', { name })
}

describe('/dev/data', () => {
  it('shows every hook result as JSON', async () => {
    renderDevData()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Data wiring' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Data wiring — Qwerty Crate'))

    await waitFor(() =>
      expect(within(block('useSettings()')).getByText(/"main_list_size": 20/)).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        within(block('usePointsSettings()')).getByText(/"mainListSize": 20/),
      ).toBeInTheDocument(),
    )
    expect(
      within(block("useLevels({ section: 'main', page: 1 })")).getByText('1 of 1 row'),
    ).toBeInTheDocument()
    expect(
      within(block("useLevel('sample-level-1')")).getByText(/"slug": "sample-level-1"/),
    ).toBeInTheDocument()

    // These wait for the level / player to load first, then use its id or position.
    await waitFor(() =>
      expect(within(block('useLevelRecords(level.id)')).getByText('1 item')).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        within(block('useAdjacentLevels(level.position)')).getByText(/"sample-level-2"/),
      ).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(within(block('usePlayerRecords(player.id)')).getByText('1 item')).toBeInTheDocument(),
    )
    expect(within(block('useSiteStats()')).getByText(/"totalAttempts": 12000/)).toBeInTheDocument()
    expect(within(block("useSearch('sample')")).getByText('1 item')).toBeInTheDocument()

    expect(getLevels).toHaveBeenCalledWith(
      { section: 'main', sort: 'position', page: 1, pageSize: 25 },
      expect.anything(),
    )
    expect(getLevelBySlug).toHaveBeenCalledWith('sample-level-1', expect.anything())
    expect(getLevelRecords).toHaveBeenCalledWith(LEVEL_ID, expect.anything())
    expect(getLevelHistory).toHaveBeenCalledWith(LEVEL_ID, expect.anything())
    expect(getAdjacentLevels).toHaveBeenCalledWith(1, expect.anything())
    expect(getPlayerBySlug).toHaveBeenCalledWith('player-alpha', expect.anything())
    expect(getPlayerRecords).toHaveBeenCalledWith(PLAYER_ID, expect.anything())
    expect(searchSite).toHaveBeenCalledWith('sample', expect.anything())
  })

  it('shows a failing query as an error with a working retry', async () => {
    vi.mocked(getSiteStats).mockRejectedValueOnce(
      new ApiError({ kind: 'network', code: 'network', message: NETWORK_MESSAGE }),
    )
    renderDevData()

    await screen.findByRole('heading', { level: 1, name: 'Data wiring' }, LAZY_TIMEOUT)
    const stats = block('useSiteStats()')
    const alert = await within(stats).findByRole('alert')
    expect(within(alert).getByText(NETWORK_MESSAGE)).toBeInTheDocument()
    expect(within(alert).getByText(/kind: network/)).toBeInTheDocument()

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await within(stats).findByText(/"totalAttempts": 12000/)).toBeInTheDocument()
    expect(getSiteStats).toHaveBeenCalledTimes(2)
  })

  it('says what a dependent query is waiting for', async () => {
    vi.mocked(getLevelBySlug).mockResolvedValue(null)
    renderDevData()

    await screen.findByRole('heading', { level: 1, name: 'Data wiring' }, LAZY_TIMEOUT)
    await waitFor(() =>
      expect(
        within(block("useLevel('sample-level-1')")).getByText('not found (null)'),
      ).toBeInTheDocument(),
    )
    expect(
      within(block('useLevelRecords(level.id)')).getByText(/Waiting for the level's id/),
    ).toBeInTheDocument()
    expect(getLevelRecords).not.toHaveBeenCalled()
  })
})
