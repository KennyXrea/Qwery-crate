import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlayers } from '../api/players'
import { getRecentChanges } from '../api/recent'
import { getRecentRecords } from '../api/records'
import { NETWORK_MESSAGE } from '../api/errors'
import { toRecentChange } from '../api/mappers'
import { LatestRecordsBox } from '../components/shared/LatestRecordsBox'
import { RecentChangeItem } from '../components/shared/RecentChangeItem'
import { RecentChangesBox } from '../components/shared/RecentChangesBox'
import { StatGrid } from '../components/shared/StatGrid'
import { StatGridSkeleton } from '../components/shared/StatGridSkeleton'
import { StatTile } from '../components/shared/StatTile'
import { TopPlayersBox } from '../components/shared/TopPlayersBox'
import type { RecentChange } from '../types/models'
import {
  EMPTY_TEST_DATA,
  TEST_RECENT_CHANGES,
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
} from './api-mocks'
import { recentLevelRow, recentRecordRow } from './api-fixtures'
import { renderWithProviders } from './render'

beforeEach(() => {
  mockApiDefaults()
})

function renderItem(change: RecentChange, showDate = false) {
  renderWithProviders(
    <ol>
      <RecentChangeItem change={change} showDate={showDate} />
    </ol>,
  )
  return screen.getByRole('listitem')
}

/** The sentence as a sighted reader sees it (screen-reader-only text removed). */
function visibleSentence(item: HTMLElement): string {
  const copy = item.querySelector('p')?.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.sr-only').forEach((node) => node.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

describe('RecentChangeItem', () => {
  it('"Player beat Level (attempts, video)" with links to both and a safe video link', () => {
    const item = renderItem(toRecentChange(recentRecordRow()))

    expect(visibleSentence(item)).toBe('Player Alpha beat Sample Level 1 (12,000 attempts, video)')
    expect(within(item).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(item).getByRole('link', { name: 'Sample Level 1' })).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    const video = within(item).getByRole('link', { name: /^video/ })
    expect(video).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(video).toHaveAttribute('target', '_blank')
    expect(video).toHaveAttribute('rel', 'noopener noreferrer')
    expect(item).toHaveAttribute('data-kind', 'record')
  })

  it.each([
    [{ attempts: 1, video_url: null }, 'Player Alpha beat Sample Level 1 (1 attempt)'],
    [{ attempts: null }, 'Player Alpha beat Sample Level 1 (video)'],
    [{ attempts: null, video_url: null }, 'Player Alpha beat Sample Level 1'],
    [{ attempts: null, video_url: 'javascript:alert(1)' }, 'Player Alpha beat Sample Level 1'],
  ])('record %j → %s', (fields, sentence) => {
    const item = renderItem(toRecentChange(recentRecordRow(fields)))
    expect(visibleSentence(item)).toBe(sentence)
    if (!sentence.includes('video')) {
      expect(within(item).queryByRole('link', { name: /video/ })).not.toBeInTheDocument()
    }
  })

  it('"Level was added at #N"', () => {
    const item = renderItem(
      toRecentChange(recentLevelRow({ kind: 'level_added', old_position: null, new_position: 7 })),
    )
    expect(visibleSentence(item)).toBe('Sample Level 1 was added at #7')
    expect(within(item).getByRole('link')).toHaveAttribute('href', '/level/sample-level-1')
  })

  it('"Level moved from #A to #B" going up: green, with the words "up N"', () => {
    const item = renderItem(toRecentChange(recentLevelRow({ old_position: 4, new_position: 1 })))
    expect(visibleSentence(item)).toBe('Sample Level 1 moved from #4 to #1 up 3')
    expect(within(item).getByText(/up 3/)).toHaveClass('text-success')
    expect(item.querySelector('[aria-hidden="true"]')).toHaveClass('text-success')
  })

  it('going down: red, with the words "down N"', () => {
    const item = renderItem(toRecentChange(recentLevelRow({ old_position: 2, new_position: 5 })))
    expect(visibleSentence(item)).toBe('Sample Level 1 moved from #2 to #5 down 3')
    expect(within(item).getByText(/down 3/)).toHaveClass('text-danger')
  })

  it('can show the day it happened', () => {
    const item = renderItem(toRecentChange(recentRecordRow({ event_date: '2026-01-05' })), true)
    const time = within(item).getByText('Jan 5, 2026')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-01-05')
  })
})

describe('StatTile / StatGrid', () => {
  it('pairs each label with its value', () => {
    const { container } = renderWithProviders(
      <StatGrid label="Level stats" columns={3}>
        <StatTile label="Points" value="250.00" />
        <StatTile label="Victors" value="2" hint="of 3 players" />
      </StatGrid>,
    )
    const grid = container.querySelector('dl')
    expect(grid).toHaveAttribute('aria-label', 'Level stats')
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Points',
      'Victors',
    ])
    expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual([
      '250.00',
      '2',
      'of 3 players',
    ])
  })

  it('has a matching skeleton hidden from screen readers', () => {
    const { container } = renderWithProviders(<StatGridSkeleton count={6} columns={3} />)
    const grid = container.firstElementChild as HTMLElement
    expect(grid).toHaveAttribute('aria-hidden', 'true')
    expect(grid.children).toHaveLength(6)
  })
})

describe('RecentChangesBox', () => {
  it('shows the 5 newest changes and links to /recent', async () => {
    renderWithProviders(<RecentChangesBox />)

    const box = screen.getByRole('region', { name: 'Latest changes' })
    await waitFor(() => expect(within(box).getAllByRole('listitem')).toHaveLength(5))
    expect(getRecentChanges).toHaveBeenCalledWith(
      { page: 1, pageSize: 5 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    const first = TEST_RECENT_CHANGES[0]
    expect(within(box).getAllByRole('listitem')[0]).toHaveAttribute('data-kind', first?.kind)
    expect(within(box).getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/recent')
  })

  it('shows a skeleton while loading', () => {
    vi.mocked(getRecentChanges).mockReturnValue(pendingForever())
    const { container } = renderWithProviders(<RecentChangesBox />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('shows an error with a working Try again', async () => {
    vi.mocked(getRecentChanges).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<RecentChangesBox />)

    // (The toast area is an alert region too, so look inside the box.)
    const box = screen.getByRole('region', { name: 'Latest changes' })
    const alert = await within(box).findByRole('alert')
    expect(alert).toHaveTextContent(NETWORK_MESSAGE)
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5))
    expect(getRecentChanges).toHaveBeenCalledTimes(2)
  })

  it('says when there is nothing yet', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderWithProviders(<RecentChangesBox />)
    expect(await screen.findByText('No changes yet')).toBeInTheDocument()
  })
})

describe('LatestRecordsBox', () => {
  it('lists the newest completions first — including one entered without a date', async () => {
    renderWithProviders(<LatestRecordsBox />)

    const box = screen.getByRole('region', { name: 'Latest records' })
    await waitFor(() => expect(within(box).getAllByRole('listitem')).toHaveLength(5))
    const [first] = within(box).getAllByRole('listitem')
    expect(visibleSentence(first as HTMLElement)).toBe('Player Alpha beat Sample Level 4')
    expect(getRecentRecords).toHaveBeenCalledWith(5, expect.anything())
    expect(within(box).getByRole('link', { name: /view all/i })).toHaveAttribute(
      'href',
      '/recent?kind=record',
    )
  })

  it('has an error state', async () => {
    vi.mocked(getRecentRecords).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<LatestRecordsBox />)
    const box = screen.getByRole('region', { name: 'Latest records' })
    expect(await within(box).findByRole('alert')).toHaveTextContent(
      "Couldn't load the latest records",
    )
  })

  it('says when there are no records', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderWithProviders(<LatestRecordsBox />)
    expect(await screen.findByText('No records yet')).toBeInTheDocument()
  })
})

describe('TopPlayersBox', () => {
  it('shows ranked players with points, leaving out players without a rank', async () => {
    renderWithProviders(<TopPlayersBox />)

    const box = screen.getByRole('region', { name: 'Top players' })
    await waitFor(() => expect(within(box).getAllByRole('listitem')).toHaveLength(2))
    const [alpha, beta] = within(box).getAllByRole('listitem')
    expect(alpha).toHaveTextContent('Rank #1')
    expect(
      within(alpha as HTMLElement).getByRole('link', { name: 'Player Alpha' }),
    ).toHaveAttribute('href', '/player/player-alpha')
    expect(alpha).toHaveTextContent('701.84 pts')
    expect(
      within(alpha as HTMLElement).getByRole('img', { name: 'Flag: United States' }),
    ).toBeInTheDocument()
    // One link per row (the whole row is clickable), named just by the player.
    expect(within(alpha as HTMLElement).getAllByRole('link')).toHaveLength(1)
    expect(beta).toHaveTextContent('Player Beta')
    expect(box).not.toHaveTextContent('Player Gamma')
    expect(getPlayers).toHaveBeenCalledWith({ page: 1, pageSize: 5 }, expect.anything())
    expect(within(box).getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/players')
  })

  it('has loading, error and empty states', async () => {
    vi.mocked(getPlayers).mockReturnValueOnce(pendingForever())
    const first = renderWithProviders(<TopPlayersBox />)
    expect(first.container.querySelector('[aria-busy="true"]')).not.toBeNull()
    first.unmount()

    vi.mocked(getPlayers).mockRejectedValueOnce(apiNetworkError())
    const second = renderWithProviders(<TopPlayersBox />)
    const box = screen.getByRole('region', { name: 'Top players' })
    expect(await within(box).findByRole('alert')).toHaveTextContent("Couldn't load the top players")
    second.unmount()

    mockApiDefaults(EMPTY_TEST_DATA)
    renderWithProviders(<TopPlayersBox />)
    expect(await screen.findByText('No ranked players yet')).toBeInTheDocument()
  })
})
