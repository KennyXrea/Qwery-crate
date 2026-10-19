import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLevelBySlug, getLevelHistory, getLevelRecords } from '../api/levels'
import { LevelPage } from '../pages/LevelPage'
import type { Completion, Level } from '../types/models'
import {
  TEST_COMPLETIONS,
  TEST_LEVELS,
  TEST_MEDAL_URL,
  TEST_YOUTUBE_URL,
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
} from './api-mocks'
import { renderWithProviders } from './render'

// The level page through the real hooks, with the API answering from the fake dataset in
// api-mocks.ts (Sample Level 1–6; Main #1–3, Extended #4–5, Legacy #6).

const LEVEL_1 = TEST_LEVELS[0] as Level
const LEVEL_2 = TEST_LEVELS[1] as Level

function renderLevel(slug: string) {
  return renderWithProviders(<LevelPage />, { path: '/level/:slug', route: `/level/${slug}` })
}

/** Shows this level (built from a test level) instead of whatever the slug would find. */
function serveLevel(level: Level) {
  vi.mocked(getLevelBySlug).mockResolvedValue(level)
}

async function findHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

/** The stat tile (label + value + hint) with this label. */
function statTile(label: string): HTMLElement {
  const grid = screen.getByLabelText('Level stats')
  const tile = within(grid).getByText(label, { selector: 'dt *' }).closest('div')
  if (!tile) throw new Error(`No stat tile "${label}"`)
  return tile
}

/** jsdom has no clipboard: give navigator one for a test (remove it again afterwards). */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

/** The data rows of the records table (not the header row). */
function recordRows(): HTMLElement[] {
  const table = screen.getByRole('table')
  const [, body] = within(table).getAllByRole('rowgroup')
  return within(body as HTMLElement).getAllByRole('row')
}

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

describe('LevelPage: header and title', () => {
  it('shows the rank, section, name, byline and description, and sets the title', async () => {
    renderLevel('sample-level-1')

    expect(await findHeading('Sample Level 1')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Sample Level 1 — Qwerty Crate'))

    expect(screen.getByText('Rank', { exact: false }).parentElement).toHaveTextContent('Rank #1')
    expect(screen.getByText('Main')).toHaveTextContent('Main list')
    const byline = screen.getByText(/verified by/).closest('p') as HTMLElement
    expect(byline).toHaveTextContent('by Creator Alpha · verified by Player Alpha')
    expect(screen.getByText('The hardest fake level on the list.')).toBeInTheDocument()
    // Back to the level's section of the list (Main = the list's default).
    expect(screen.getByRole('link', { name: 'Back to the list' })).toHaveAttribute('href', '/list')
  })

  it('leaves out the creator or verifier when unknown and links back to the right section', async () => {
    serveLevel({ ...TEST_LEVELS[3]!, creator: null, verifier: 'Player Alpha' })
    renderLevel('sample-level-4')

    await findHeading('Sample Level 4')
    const byline = screen.getByText(/verified by/).closest('p') as HTMLElement
    expect(byline).toHaveTextContent(/^verified by Player Alpha$/)
    expect(screen.getByRole('link', { name: 'Back to the list' })).toHaveAttribute(
      'href',
      '/list?section=extended',
    )
  })

  it('shows a skeleton (and no heading) while the level loads', () => {
    vi.mocked(getLevelBySlug).mockReturnValue(pendingForever())
    renderLevel('sample-level-1')

    expect(screen.getByText('Loading the level…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('shows an error with Try again, which loads the level', async () => {
    vi.mocked(getLevelBySlug).mockRejectedValueOnce(apiNetworkError())
    renderLevel('sample-level-1')

    expect(await screen.findByText("Couldn't load this level")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await findHeading('Sample Level 1')).toBeInTheDocument()
    expect(getLevelBySlug).toHaveBeenCalledTimes(2)
  })
})

describe('LevelPage: not found', () => {
  it('shows "Level not found" with a link back to the list', async () => {
    renderLevel('no-such-level')

    expect(await findHeading('Level not found')).toBeInTheDocument()
    expect(screen.getByText('/level/no-such-level')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the list' })).toHaveAttribute('href', '/list')
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
    await waitFor(() => expect(document.title).toBe('Level not found — Qwerty Crate'))
    // Nothing else is loaded for a level that doesn't exist.
    expect(getLevelRecords).not.toHaveBeenCalled()
  })
})

describe('LevelPage: stat grid', () => {
  it('shows every stat of the level', async () => {
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(statTile('GD level ID')).toHaveTextContent('1000001')
    expect(statTile('In-game difficulty')).toHaveTextContent('Extreme Demon')
    expect(statTile('Our difficulty rating')).toHaveTextContent('9.5')
    expect(statTile('Points')).toHaveTextContent('250.00')
    expect(statTile('Length')).toHaveTextContent('1:15')
    expect(statTile('Victors')).toHaveTextContent('2')
    expect(statTile('Avg enjoyment')).toHaveTextContent('8.0out of 10')
    expect(statTile('Avg attempts')).toHaveTextContent('13,000')

    const firstVictor = statTile('First victor')
    expect(within(firstVictor).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(firstVictor).getByText('Jan 5, 2026')).toHaveAttribute('datetime', '2026-01-05')
  })

  it('hides the GD level ID when it is unknown and shows "—" for other missing values', async () => {
    serveLevel({
      ...TEST_LEVELS[4]!,
      gd_level_id: null,
      difficulty_rating: null,
      length_seconds: null,
    })
    renderLevel('sample-level-5')
    await findHeading('Sample Level 5')

    expect(within(screen.getByLabelText('Level stats')).queryByText('GD level ID')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copy GD level ID' })).not.toBeInTheDocument()
    expect(statTile('Our difficulty rating')).toHaveTextContent('—Not rated yet')
    expect(statTile('Length')).toHaveTextContent('—')
    expect(statTile('Avg enjoyment')).toHaveTextContent('—No ratings yet')
    expect(statTile('Avg attempts')).toHaveTextContent('—')
    expect(statTile('First victor')).toHaveTextContent('Nobody yet')
    expect(statTile('Victors')).toHaveTextContent('0')
  })

  it('notes a points override, and that Legacy levels give no points', async () => {
    serveLevel({ ...LEVEL_2, points: 199.5, points_override: 199.5 })
    const { unmount } = renderLevel('sample-level-2')
    await findHeading('Sample Level 2')
    expect(statTile('Points')).toHaveTextContent('199.50Set by hand (override)')
    unmount()

    mockApiDefaults()
    renderLevel('sample-level-6')
    await findHeading('Sample Level 6')
    expect(statTile('Points')).toHaveTextContent('0.00Legacy levels give no points')
  })

  it('copies the GD level ID and says so in a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    try {
      renderLevel('sample-level-1')
      await findHeading('Sample Level 1')

      fireEvent.click(screen.getByRole('button', { name: 'Copy GD level ID' }))

      expect(await screen.findByText('Level ID copied')).toBeInTheDocument()
      expect(writeText).toHaveBeenCalledWith('1000001')
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('shows an error toast with the ID when the clipboard is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    stubClipboard(writeText)
    try {
      renderLevel('sample-level-1')
      await findHeading('Sample Level 1')

      fireEvent.click(screen.getByRole('button', { name: 'Copy GD level ID' }))

      expect(await screen.findByText("Couldn't copy the level ID")).toBeInTheDocument()
      expect(screen.getByText(/The ID is 1000001\./)).toBeInTheDocument()
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })
})

describe('LevelPage: records', () => {
  it('lists the records first victor first, with the badge only on the first victor', async () => {
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    const rows = await waitFor(() => recordRows())
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(rows[0]!).getByText('First victor')).toBeInTheDocument()
    expect(within(rows[0]!).getByRole('img', { name: 'Flag: United States' })).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent('Jan 5, 2026')
    expect(rows[0]).toHaveTextContent('12,000')
    expect(rows[0]).toHaveTextContent('First try at 12k, sample note.')

    expect(within(rows[1]!).getByRole('link', { name: 'Player Beta' })).toBeInTheDocument()
    expect(within(rows[1]!).queryByText('First victor')).not.toBeInTheDocument()
    expect(screen.getByText('2 victors')).toBeInTheDocument()

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)
    expect(headers).toEqual(['Player', 'Date', 'Attempts', 'Enjoyment', 'Video', 'Notes'])
  })

  it('keeps the order getLevelRecords gives (the API decides who was first)', async () => {
    const [alpha, beta] = TEST_COMPLETIONS as [Completion, Completion]
    vi.mocked(getLevelRecords).mockResolvedValue([
      { ...beta, is_first_victory: true, date_beaten: null },
      { ...alpha, is_first_victory: false },
    ])
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    const rows = await waitFor(() => recordRows())
    expect(within(rows[0]!).getByRole('link', { name: 'Player Beta' })).toBeInTheDocument()
    expect(within(rows[0]!).getByText('First victor')).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent('Date unknown')
    expect(within(rows[1]!).queryByText('First victor')).not.toBeInTheDocument()
  })

  it('links each video safely in a new tab, and never an unsafe link', async () => {
    const [alpha, beta] = TEST_COMPLETIONS as [Completion, Completion]
    vi.mocked(getLevelRecords).mockResolvedValue([
      alpha,
      { ...beta, video_url: 'javascript:alert(1)' },
    ])
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    const rows = await waitFor(() => recordRows())
    const video = within(rows[0]!).getByRole('link', { name: /watch video by player alpha/i })
    expect(video).toHaveAttribute('href', TEST_YOUTUBE_URL)
    expect(video).toHaveAttribute('target', '_blank')
    expect(video).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(rows[1]!).queryByRole('link', { name: /watch video/i })).toBeNull()
    expect(rows[1]).toHaveTextContent('No video')
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it('says "Nobody has beaten this level yet" when there are no records', async () => {
    renderLevel('sample-level-5')
    await findHeading('Sample Level 5')

    expect(await screen.findByText('Nobody has beaten this level yet')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error with Try again when the records fail to load', async () => {
    vi.mocked(getLevelRecords).mockRejectedValueOnce(apiNetworkError())
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(await screen.findByText("Couldn't load the records")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(recordRows()).toHaveLength(2))
  })
})

describe('LevelPage: video', () => {
  const SHOWCASE_ID = 'aaaaaaaaaaa'
  const iframe = () => document.querySelector('iframe')

  it("falls back to the first victor's YouTube video when there is no showcase video", async () => {
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(iframe()).toHaveAttribute(
      'src',
      expect.stringMatching(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/),
    )
    expect(iframe()).toHaveAttribute('title', 'Sample Level 1 — first victory by Player Alpha')
    expect(screen.getByText(/here is the first victory/)).toHaveTextContent(
      'No showcase video yet, so here is the first victory by Player Alpha.',
    )
    // The video is the picture, so the header shows no thumbnail.
    expect(screen.queryByRole('img', { name: 'Sample Level 1 thumbnail' })).toBeNull()
  })

  it('prefers the showcase video', async () => {
    serveLevel({ ...LEVEL_1, showcase_video_url: `https://youtu.be/${SHOWCASE_ID}` })
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(iframe()?.getAttribute('src')).toContain(`/embed/${SHOWCASE_ID}`)
    expect(iframe()).toHaveAttribute('title', 'Sample Level 1 — showcase video')
    expect(screen.getByText('Showcase video')).toBeInTheDocument()
  })

  it('shows a "Watch video" button for other sites, plus the thumbnail in the header', async () => {
    serveLevel({ ...LEVEL_1, showcase_video_url: TEST_MEDAL_URL })
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(iframe()).toBeNull()
    const watch = screen.getByRole('link', { name: /^watch video\s*\(opens in a new tab\)$/i })
    expect(watch).toHaveAttribute('href', TEST_MEDAL_URL)
    expect(watch).toHaveAttribute('rel', 'noopener noreferrer')
    // The thumbnail chain still finds the first victor's YouTube picture.
    expect(screen.getByRole('img', { name: 'Sample Level 1 thumbnail' })).toBeInTheDocument()
  })

  it('shows no video at all when there is none (the header picture stands in)', async () => {
    serveLevel({ ...LEVEL_1, showcase_video_url: 'not a link', first_victor_video_url: null })
    const { container } = renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    expect(iframe()).toBeNull()
    expect(screen.queryByText(/showcase video|first victory/i)).toBeNull()
    expect(container.querySelector('figure')).toBeNull()
    // No picture to load: the drawn placeholder (initials) is shown instead.
    expect(screen.queryByRole('img', { name: 'Sample Level 1 thumbnail' })).toBeNull()
    expect(container).toHaveTextContent('S1')
  })
})

describe('LevelPage: position history, notes and neighbours', () => {
  it('shows the history newest first, with shifts folded together', async () => {
    renderLevel('sample-level-2')
    await findHeading('Sample Level 2')

    const history = await screen.findByRole('region', { name: 'Position history' })
    const items = await within(history).findAllByRole('listitem')
    const top = items.filter((item) => item.parentElement === items[0]?.parentElement)
    expect(top.map((item) => item.dataset.reason)).toEqual(['shifted', 'added'])
    expect(top[0]).toHaveTextContent("Shifted 2 times by other levels' changes")
    expect(top[1]).toHaveTextContent('Added at #2')
  })

  it('shows a move with its direction', async () => {
    renderLevel('sample-level-3')
    await findHeading('Sample Level 3')

    const history = await screen.findByRole('region', { name: 'Position history' })
    const [moved, added] = await within(history).findAllByRole('listitem')
    expect(moved).toHaveTextContent(/Moved #2 → to #3 down 1/)
    expect(added).toHaveTextContent('Added at #2')
  })

  it('shows an error with Try again when the history fails to load', async () => {
    vi.mocked(getLevelHistory).mockRejectedValueOnce(apiNetworkError())
    renderLevel('sample-level-3')
    await findHeading('Sample Level 3')

    expect(await screen.findByText("Couldn't load the position history")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    const history = screen.getByRole('region', { name: 'Position history' })
    expect(await within(history).findByText(/Added at/)).toBeInTheDocument()
  })

  it('shows the notes only when the level has some', async () => {
    const { unmount } = renderLevel('sample-level-1')
    await findHeading('Sample Level 1')
    const notes = screen.getByRole('region', { name: 'Notes' })
    expect(notes).toHaveTextContent('Sample notes for testing.')
    unmount()

    renderLevel('sample-level-2')
    await findHeading('Sample Level 2')
    expect(screen.queryByRole('region', { name: 'Notes' })).not.toBeInTheDocument()
  })

  it('links to the previous and next levels by position, and follows them', async () => {
    renderLevel('sample-level-2')
    await findHeading('Sample Level 2')

    const nav = screen.getByRole('navigation', { name: 'Previous and next levels' })
    const prev = await within(nav).findByRole('link', { name: 'Previous level: #1 Sample Level 1' })
    const next = within(nav).getByRole('link', { name: 'Next level: #3 Sample Level 3' })
    expect(prev).toHaveAttribute('href', '/level/sample-level-1')
    expect(next).toHaveAttribute('href', '/level/sample-level-3')

    fireEvent.click(next)
    expect(await findHeading('Sample Level 3')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Sample Level 3 — Qwerty Crate'))
  })

  it('has no previous link on #1', async () => {
    renderLevel('sample-level-1')
    await findHeading('Sample Level 1')

    const nav = screen.getByRole('navigation', { name: 'Previous and next levels' })
    expect(await within(nav).findByRole('link', { name: /^Next level/ })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /^Previous level/ })).toBeNull()
  })
})
