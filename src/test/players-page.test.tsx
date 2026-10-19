import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlayers } from '../api/players'
import { formatPoints } from '../lib/format'
import { PlayersPage } from '../pages/PlayersPage'
import type { Player } from '../types/models'
import {
  apiNetworkError,
  EMPTY_TEST_DATA,
  mockApiDefaults,
  pendingForever,
  TEST_PLAYERS,
} from './api-mocks'
import { renderWithProviders } from './render'

const ALPHA = TEST_PLAYERS[0] as Player

function renderPlayers(route = '/players') {
  return renderWithProviders(<PlayersPage />, { route, path: '/players' })
}

/** The leaderboard's body rows (the first row holds the column headers). */
async function leaderboardRows(name: string | RegExp = 'Players ranked by total points') {
  const table = await screen.findByRole('table', { name })
  return within(table).getAllByRole('row').slice(1)
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search players' })
}

/** A fake leaderboard of `total` players (ranks 1…total), answered page by page. */
function mockBigLeaderboard(total: number) {
  const players: Player[] = Array.from({ length: total }, (_, i) => ({
    ...ALPHA,
    id: `20000000-0000-4000-8000-${String(100 + i).padStart(12, '0')}`,
    name: `Player ${String(i + 1).padStart(3, '0')}`,
    slug: `player-${i + 1}`,
    rank: i + 1,
  }))
  vi.mocked(getPlayers).mockImplementation(async (params = {}) => {
    const page = params.page ?? 1
    const size = params.pageSize ?? 25
    return { rows: players.slice((page - 1) * size, page * size), total }
  })
}

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

describe('PlayersPage', () => {
  it('ranks every player with points, completions and their hardest level', async () => {
    renderPlayers()

    expect(screen.getByRole('heading', { level: 1, name: 'Players' })).toBeInTheDocument()
    const rows = await leaderboardRows()
    expect(rows).toHaveLength(3)

    const [alpha, beta, gamma] = rows as [HTMLElement, HTMLElement, HTMLElement]
    expect(within(alpha).getByRole('rowheader')).toHaveTextContent('Player Alpha')
    expect(within(alpha).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(alpha).getByRole('img', { name: 'Flag: United States' })).toBeInTheDocument()

    const [rank, points, completions, hardest] = within(alpha).getAllByRole('cell')
    expect(rank).toHaveTextContent('Rank #1')
    expect(points).toHaveTextContent(formatPoints(ALPHA.total_points))
    expect(completions).toHaveTextContent('3')
    expect(
      within(hardest as HTMLElement).getByRole('link', { name: 'Sample Level 1' }),
    ).toHaveAttribute('href', '/level/sample-level-1')
    expect(hardest).toHaveTextContent('#1')

    expect(within(beta).getAllByRole('cell')[0]).toHaveTextContent('Rank #2')
    expect(within(beta).getByRole('link', { name: 'Sample Level 1' })).toBeInTheDocument()

    // Player Gamma has no completions: no rank, listed last.
    expect(within(gamma).getByRole('rowheader')).toHaveTextContent('Player Gamma')
    const gammaCells = within(gamma).getAllByRole('cell')
    expect(gammaCells[0]).toHaveTextContent('Unranked')
    expect(gammaCells[3]).toHaveTextContent('No completions yet')
    expect(within(gamma).queryByRole('img')).not.toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('3 players')
    expect(screen.getByRole('columnheader', { name: 'Hardest' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Players — Qwerty Crate'))
  })

  it('links to the points explanation', async () => {
    renderPlayers()
    await leaderboardRows()
    expect(screen.getByRole('link', { name: 'How points work' })).toHaveAttribute('href', '/about')
  })

  it('shows a skeleton while the first page loads', () => {
    vi.mocked(getPlayers).mockReturnValue(pendingForever())
    const { container } = renderPlayers()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Loading players…')
    // The search box can be used while the leaderboard loads.
    expect(searchBox()).toBeEnabled()
  })

  it('shows an error with a working "Try again"', async () => {
    vi.mocked(getPlayers).mockRejectedValueOnce(apiNetworkError())
    renderPlayers()

    const alert = (await screen.findByText("Couldn't load the leaderboard")).closest(
      '[role="alert"]',
    ) as HTMLElement
    expect(alert).toHaveTextContent("Couldn't reach the server")
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await leaderboardRows()).toHaveLength(3)
    expect(screen.queryByText("Couldn't load the leaderboard")).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no players', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderPlayers()

    expect(await screen.findByRole('heading', { name: 'No players yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse the list/i })).toHaveAttribute('href', '/list')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('PlayersPage search', () => {
  it('searches after typing pauses and keeps the search in the URL', async () => {
    const { router } = renderPlayers()
    await leaderboardRows()

    fireEvent.change(searchBox(), { target: { value: 'beta' } })
    expect(searchBox()).toHaveValue('beta')
    // Debounced: nothing happens straight away.
    expect(router.state.location.search).toBe('')

    await waitFor(() => expect(router.state.location.search).toBe('?q=beta'))
    // Typing replaces the history entry instead of adding one per search.
    expect(router.state.historyAction).toBe('REPLACE')

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    const rows = await leaderboardRows(/matching “beta”/)
    expect(within(rows[0] as HTMLElement).getByRole('rowheader')).toHaveTextContent('Player Beta')
    expect(screen.getByRole('status')).toHaveTextContent('1 player matches “beta”')
    expect(getPlayers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'beta', page: 1, pageSize: 25 }),
      expect.anything(),
    )
  })

  it('searches straight away on Enter', async () => {
    const { router } = renderPlayers()
    await leaderboardRows()

    fireEvent.change(searchBox(), { target: { value: '  Alpha ' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Players' }))

    expect(router.state.location.search).toBe('?q=Alpha')
    expect(searchBox()).toHaveValue('  Alpha ')
  })

  it('reads the search from the URL', async () => {
    renderPlayers('/players?q=gamma')

    expect(searchBox()).toHaveValue('gamma')
    const rows = await leaderboardRows(/matching “gamma”/)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Player Gamma')
  })

  it('starts a new search on page 1', async () => {
    const { router } = renderPlayers('/players?page=2')
    expect(await screen.findByRole('heading', { name: 'This page is empty' })).toBeInTheDocument()

    fireEvent.change(searchBox(), { target: { value: 'alpha' } })
    await waitFor(() => expect(router.state.location.search).toBe('?q=alpha'))
  })

  it('offers to clear a search that matches nobody', async () => {
    const { router } = renderPlayers()
    await leaderboardRows()

    fireEvent.change(searchBox(), { target: { value: 'zzz' } })
    expect(
      await screen.findByRole('heading', { name: 'No players match “zzz”' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(router.state.location.search).toBe('')
    await waitFor(() => expect(searchBox()).toHaveValue(''))
    expect(await leaderboardRows()).toHaveLength(3)
  })

  it('follows Back and Forward', async () => {
    const { router } = renderPlayers()
    await leaderboardRows()

    await act(() => router.navigate('/players?q=alpha'))
    expect(searchBox()).toHaveValue('alpha')
    expect(await leaderboardRows(/matching “alpha”/)).toHaveLength(1)

    await act(() => router.navigate(-1))
    expect(searchBox()).toHaveValue('')
    expect(await leaderboardRows()).toHaveLength(3)
  })

  it('ignores a one-letter search (the API needs 2 characters)', async () => {
    const { router } = renderPlayers()
    await leaderboardRows()

    fireEvent.change(searchBox(), { target: { value: 'a' } })
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(router.state.location.search).toBe('')
    expect(await leaderboardRows()).toHaveLength(3)
  })
})

describe('PlayersPage pagination', () => {
  it('pages through a long leaderboard with ?page=', async () => {
    mockBigLeaderboard(60)
    const { router } = renderPlayers()

    expect(await leaderboardRows()).toHaveLength(25)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–25 of 60 players')

    const pager = screen.getByRole('navigation', { name: 'Leaderboard pages' })
    fireEvent.click(within(pager).getByRole('button', { name: 'Next page' }))

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Showing 26–50 of 60 players'),
    )
    expect(screen.getByRole('link', { name: 'Player 026' })).toBeInTheDocument()
    expect(getPlayers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 25 }),
      expect.anything(),
    )

    // Back to page 1 drops the parameter.
    fireEvent.click(within(pager).getByRole('button', { name: 'Page 1' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('opens the page in the URL', async () => {
    mockBigLeaderboard(60)
    renderPlayers('/players?page=3')

    const rows = await leaderboardRows()
    expect(rows).toHaveLength(10)
    expect(rows[0]).toHaveTextContent('Player 051')
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
  })

  it.each(['abc', '0', '-2', ''])('treats ?page=%s as page 1', async (value) => {
    renderPlayers(`/players?page=${value}`)
    expect(await leaderboardRows()).toHaveLength(3)
    expect(getPlayers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
      expect.anything(),
    )
  })

  it('offers a way back from a page past the end', async () => {
    const { router } = renderPlayers('/players?page=4')

    expect(await screen.findByRole('heading', { name: 'This page is empty' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 1' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await leaderboardRows()).toHaveLength(3)
  })

  it('keeps the old page on screen, marked busy, while the next one loads', async () => {
    mockBigLeaderboard(60)
    const { router, container } = renderPlayers()
    await leaderboardRows()

    vi.mocked(getPlayers).mockReturnValue(pendingForever())
    await act(() => router.navigate('/players?page=2'))

    expect(await leaderboardRows()).toHaveLength(25)
    expect(screen.getByRole('link', { name: 'Player 001' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('has no pager when everyone fits on one page', async () => {
    renderPlayers()
    await leaderboardRows()
    expect(screen.queryByRole('navigation', { name: 'Leaderboard pages' })).not.toBeInTheDocument()
  })
})
