import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlayerBySlug, getPlayerRecords } from '../api/players'
import { formatPoints } from '../lib/format'
import { PlayerPage } from '../pages/PlayerPage'
import type { Completion, Player } from '../types/models'
import {
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
  TEST_COMPLETIONS,
  TEST_MEDAL_URL,
  TEST_PLAYERS,
  TEST_YOUTUBE_URL,
  testPlayerId,
} from './api-mocks'
import { renderWithProviders } from './render'

const ALPHA = TEST_PLAYERS[0] as Player

function renderPlayer(route = '/player/player-alpha') {
  return renderWithProviders(<PlayerPage />, { route, path: '/player/:slug' })
}

/** The value shown under a stat tile's label. */
function statValue(label: string): HTMLElement {
  const grid = screen.getByLabelText('Player stats')
  const term = within(grid).getByText(label, { selector: 'dt span' })
  const tile = term.closest('div') as HTMLElement
  return tile.querySelector('dd') as HTMLElement
}

/** The completed-levels table's body rows (the first row holds the column headers). */
async function completionRows() {
  const table = await screen.findByRole('table', { name: /Levels .* has beaten/ })
  return within(table).getAllByRole('row').slice(1)
}

function levelNames(rows: HTMLElement[]) {
  return rows.map((row) => within(row).getByRole('rowheader').querySelector('a')?.textContent)
}

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

describe('PlayerPage header and stats', () => {
  it('shows the header: name, rank, country, channel link and bio', async () => {
    renderPlayer()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Player Alpha' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Player Alpha — Qwerty Crate'))

    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('A fake player for tests.')).toBeInTheDocument()

    const channel = screen.getByRole('link', { name: /Channel/ })
    expect(channel).toHaveAttribute('href', 'https://www.youtube.com/@sample-player-alpha')
    expect(channel).toHaveAttribute('target', '_blank')
    expect(channel).toHaveAttribute('rel', 'noopener noreferrer')
    expect(channel).toHaveTextContent('youtube.com')

    expect(screen.getByRole('link', { name: /All players/ })).toHaveAttribute('href', '/players')
  })

  it('shows the stat grid', async () => {
    renderPlayer()
    await screen.findByRole('heading', { level: 1, name: 'Player Alpha' })

    expect(statValue('Rank')).toHaveTextContent('Rank #1')
    expect(statValue('Total points')).toHaveTextContent(formatPoints(ALPHA.total_points))
    expect(statValue('Completions')).toHaveTextContent('3')
    expect(statValue('First victories')).toHaveTextContent('3')
    expect(statValue('Total attempts')).toHaveTextContent('21,000')
    expect(statValue('Avg enjoyment')).toHaveTextContent('7.5/10 out of 10')

    const hardest = statValue('Hardest level')
    expect(within(hardest).getByRole('link', { name: 'Sample Level 1' })).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    expect(screen.getByText('#1 on the list')).toBeInTheDocument()
  })

  it('never links an unsafe channel address', async () => {
    vi.mocked(getPlayerBySlug).mockResolvedValue({ ...ALPHA, channel_url: 'javascript:alert(1)' })
    renderPlayer()

    await screen.findByRole('heading', { level: 1, name: 'Player Alpha' })
    expect(screen.queryByRole('link', { name: /Channel/ })).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })
})

describe('PlayerPage completed levels', () => {
  it('lists every completed level, hardest first', async () => {
    renderPlayer()

    const rows = await completionRows()
    expect(levelNames(rows)).toEqual(['Sample Level 1', 'Sample Level 2', 'Sample Level 4'])
    expect(screen.getByRole('columnheader', { name: 'Rank' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    const [first, second, third] = rows as [HTMLElement, HTMLElement, HTMLElement]
    const firstCells = within(first).getAllByRole('cell')
    expect(firstCells[0]).toHaveTextContent('Rank #1')
    expect(within(first).getByRole('link', { name: 'Sample Level 1' })).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    expect(within(first).getByText('Extreme Demon')).toBeInTheDocument()
    expect(within(first).getByText('First victor')).toBeInTheDocument()
    expect(firstCells[2]).toHaveTextContent('12,000')
    expect(firstCells[3]).toHaveTextContent('8/10')
    expect(within(first).getByText('Jan 5, 2026')).toHaveAttribute('dateTime', '2026-01-05')

    const video = within(first).getByRole('link', { name: /Video of Sample Level 1/ })
    expect(video).toHaveAttribute('href', TEST_YOUTUBE_URL)
    expect(video).toHaveAttribute('target', '_blank')
    expect(video).toHaveAttribute('rel', 'noopener noreferrer')

    // A video that isn't on YouTube is still a plain link.
    expect(within(second).getByRole('link', { name: /Video of Sample Level 2/ })).toHaveAttribute(
      'href',
      TEST_MEDAL_URL,
    )

    // A completion without attempts, rating, date or video.
    expect(third).toHaveTextContent('Not recorded')
    expect(third).toHaveTextContent('Not rated')
    expect(third).toHaveTextContent('Unknown date')
    expect(third).toHaveTextContent('No video')
    expect(within(third).queryByRole('link', { name: /Video/ })).not.toBeInTheDocument()

    expect(screen.getByText('3 levels')).toBeInTheDocument()
  })

  it('sorts by date with ?sort=date, and back by position', async () => {
    const { router } = renderPlayer()
    await completionRows()

    const toggle = screen.getByRole('group', { name: 'Sort by' })
    const byDate = within(toggle).getByRole('button', { name: 'Date' })
    const byPosition = within(toggle).getByRole('button', { name: 'Position' })
    expect(byPosition).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(byDate)
    await waitFor(() => expect(router.state.location.search).toBe('?sort=date'))
    expect(byDate).toHaveAttribute('aria-pressed', 'true')
    expect(byPosition).toHaveAttribute('aria-pressed', 'false')
    await waitFor(async () =>
      expect(levelNames(await completionRows())).toEqual([
        'Sample Level 2',
        'Sample Level 1',
        'Sample Level 4',
      ]),
    )
    expect(getPlayerRecords).toHaveBeenLastCalledWith(
      testPlayerId(1),
      expect.objectContaining({ sort: 'date' }),
    )
    expect(screen.getByRole('columnheader', { name: 'Date' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    fireEvent.click(byPosition)
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await waitFor(async () =>
      expect(levelNames(await completionRows())).toEqual([
        'Sample Level 1',
        'Sample Level 2',
        'Sample Level 4',
      ]),
    )
  })

  it('opens sorted by date from the URL', async () => {
    renderPlayer('/player/player-alpha?sort=date')

    await waitFor(async () => expect(levelNames(await completionRows())[0]).toBe('Sample Level 2'))
    expect(screen.getByRole('button', { name: 'Date' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('treats an unknown ?sort= as position', async () => {
    renderPlayer('/player/player-alpha?sort=sideways')

    expect(levelNames(await completionRows())[0]).toBe('Sample Level 1')
    expect(getPlayerRecords).toHaveBeenLastCalledWith(
      testPlayerId(1),
      expect.objectContaining({ sort: 'position' }),
    )
  })

  it('never links an unsafe video address', async () => {
    const record = TEST_COMPLETIONS[0] as Completion
    vi.mocked(getPlayerRecords).mockResolvedValue([{ ...record, video_url: 'javascript:alert(1)' }])
    renderPlayer()

    const [row] = (await completionRows()) as [HTMLElement]
    expect(row).toHaveTextContent('No video')
    expect(within(row).queryByRole('link', { name: /Video/ })).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it('shows the difficulty breakdown with a text legend', async () => {
    renderPlayer()
    await completionRows()

    const region = screen.getByRole('region', { name: 'Difficulty breakdown' })
    const legend = within(region).getByRole('list', { name: 'Completions by difficulty' })
    const items = within(legend)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(items).toEqual(['Extreme Demon2', 'Hard Demon1'])
    expect(region).toHaveTextContent('3 completions')

    const segments = region.querySelectorAll<HTMLElement>('[data-testid="difficulty-bar"] > div')
    expect([...segments].map((segment) => segment.style.flexGrow)).toEqual(['2', '1'])
  })
})

describe('PlayerPage states', () => {
  it('shows an empty state for a player with no completions', async () => {
    renderPlayer('/player/player-gamma')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Player Gamma' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 3, name: 'No completions yet' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse the list/i })).toHaveAttribute('href', '/list')

    expect(statValue('Rank')).toHaveTextContent('Unranked')
    expect(statValue('Hardest level')).toHaveTextContent('—')
    expect(screen.getAllByText('Unranked').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('region', { name: 'Difficulty breakdown' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Sort by' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Channel/ })).not.toBeInTheDocument()
  })

  it('shows "Player not found" for an unknown slug', async () => {
    renderPlayer('/player/nobody-here')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Player not found' }),
    ).toBeInTheDocument()
    expect(screen.getByText('nobody-here')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All players' })).toHaveAttribute('href', '/players')
    expect(screen.getByRole('link', { name: /browse the list/i })).toHaveAttribute('href', '/list')
    await waitFor(() => expect(document.title).toBe('Player not found — Qwerty Crate'))
    expect(getPlayerRecords).not.toHaveBeenCalled()
  })

  it('shows a skeleton while the player loads', () => {
    vi.mocked(getPlayerBySlug).mockReturnValue(pendingForever())
    const { container } = renderPlayer()

    expect(screen.getByRole('status')).toHaveTextContent('Loading player…')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(document.title).toBe('Player — Qwerty Crate')
  })

  it('shows an error with a working "Try again" when the player fails to load', async () => {
    vi.mocked(getPlayerBySlug).mockRejectedValueOnce(apiNetworkError())
    renderPlayer()

    expect(
      await screen.findByRole('heading', { level: 1, name: "Couldn't load this player" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Couldn't reach the server/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Player Alpha' }),
    ).toBeInTheDocument()
  })

  it('keeps the profile and retries just the table when the completed levels fail', async () => {
    vi.mocked(getPlayerRecords).mockRejectedValueOnce(apiNetworkError())
    renderPlayer()

    expect(
      await screen.findByRole('heading', { level: 3, name: "Couldn't load the completed levels" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Player Alpha' })).toBeInTheDocument()
    expect(statValue('Completions')).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await completionRows()).toHaveLength(3)
  })

  it('keeps the sort toggle when one order fails, so the other is one tap away', async () => {
    vi.mocked(getPlayerRecords).mockImplementation(async (_id, options = {}) => {
      if (options.sort === 'date') throw apiNetworkError()
      return TEST_COMPLETIONS.filter((record) => record.player_id === testPlayerId(1))
    })
    const { router } = renderPlayer('/player/player-alpha?sort=date')

    expect(
      await screen.findByRole('heading', { level: 3, name: "Couldn't load the completed levels" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Position' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await completionRows()).toHaveLength(3)
  })

  it('shows table skeletons while the completed levels load', async () => {
    vi.mocked(getPlayerRecords).mockReturnValue(pendingForever())
    const { container } = renderPlayer()

    await screen.findByRole('heading', { level: 1, name: 'Player Alpha' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('3 levels')).toBeInTheDocument()
  })
})
