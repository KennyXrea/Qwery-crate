import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRecentChanges } from '../api/recent'
import { RecentPage } from '../pages/RecentPage'
import type { Page, RecentChange } from '../types/models'
import {
  EMPTY_TEST_DATA,
  TEST_RECENT_CHANGES,
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
} from './api-mocks'
import { renderWithProviders } from './render'

// The fake feed (api-mocks.ts) newest first: a completion on 2026-09-30 (Player Alpha beat
// Sample Level 4, entered without a date), moves on 09-02 and 09-01, then older completions
// and the six "level added" entries in January — 13 changes in all.

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  document.title = ''
})

/** Freezes only the clock (timers stay real, so React Query and Testing Library work as usual). */
function setNow(date: Date) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
}

function renderRecent(route = '/recent') {
  return renderWithProviders(<RecentPage />, { route, path: '/recent' })
}

/** The day lists of the timeline, by their heading ("Today", "Wednesday, Sep 2, 2026", …). */
async function dayList(name: string) {
  return screen.findByRole('list', { name })
}

function filterNav() {
  return screen.getByRole('navigation', { name: 'Filter recent changes' })
}

function manyChanges(count: number): RecentChange[] {
  const base = TEST_RECENT_CHANGES[0] as RecentChange
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    id: `${base.id}-${i}`,
    // Ten per day, newest first.
    event_date: `2026-09-${String(30 - Math.floor(i / 10)).padStart(2, '0')}`,
  }))
}

describe('Recent changes page', () => {
  it('has its heading and tab title', async () => {
    renderRecent()

    expect(screen.getByRole('heading', { level: 1, name: 'Recent changes' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Recent changes — Qwerty Crate'))
    expect(await dayList('Tuesday, Sep 1, 2026')).toBeInTheDocument()
  })

  it('groups the feed by day: Today, Yesterday, then dates', async () => {
    setNow(new Date(2026, 9, 1, 9, 30)) // Oct 1, 9:30 in the morning, local time
    const today = {
      ...(TEST_RECENT_CHANGES[1] as RecentChange),
      id: 'today',
      event_date: '2026-10-01',
    }
    vi.mocked(getRecentChanges).mockResolvedValue({
      rows: [today, ...TEST_RECENT_CHANGES],
      total: TEST_RECENT_CHANGES.length + 1,
    })
    renderRecent()

    const todayList = await dayList('Today')
    expect(within(todayList).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Thursday, Oct 1, 2026')).toBeInTheDocument()

    const yesterday = await dayList('Yesterday')
    expect(within(yesterday).getAllByRole('listitem')).toHaveLength(1)
    // Each entry is one RecentChangeItem line.
    expect(within(yesterday).getByRole('listitem')).toHaveTextContent(
      'Player Alpha beat Sample Level 4',
    )

    expect(await dayList('Wednesday, Sep 2, 2026')).toBeInTheDocument()
    expect(await dayList('Tuesday, Sep 1, 2026')).toBeInTheDocument()

    // Days appear newest first, in the order the server sent them.
    const dayHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => text !== 'What shows up here')
    expect(dayHeadings.slice(0, 4)).toEqual([
      'Today',
      'Yesterday',
      'Wednesday, Sep 2, 2026',
      'Tuesday, Sep 1, 2026',
    ])
    // The <time> carries the machine-readable day.
    expect(screen.getByText('Today').closest('time')).toHaveAttribute('datetime', '2026-10-01')
  })

  it("compares with the viewer's LOCAL day, not the UTC one", async () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    // 10 pm on Sep 30 in California — already Oct 1 in UTC.
    setNow(new Date('2026-10-01T05:00:00Z'))
    renderRecent()

    const todayList = await dayList('Today')
    expect(todayList).toHaveTextContent('Player Alpha beat Sample Level 4')
    expect(screen.queryByRole('list', { name: 'Yesterday' })).not.toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    vi.mocked(getRecentChanges).mockReturnValue(pendingForever())
    const { container } = renderRecent()

    expect(screen.getByText('Loading recent changes…')).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(5)
    expect(screen.queryByRole('list', { name: /\d{4}|Today|Yesterday/ })).not.toBeInTheDocument()
  })

  it('shows an error with a working Try again button', async () => {
    vi.mocked(getRecentChanges).mockRejectedValueOnce(apiNetworkError())
    renderRecent()

    // (The toast area is an alert region too, so find the error box by its text.)
    const alert = (await screen.findByText("Couldn't load recent changes")).closest(
      '[role="alert"]',
    ) as HTMLElement
    expect(alert).not.toBeNull()

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await dayList('Tuesday, Sep 1, 2026')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load recent changes")).not.toBeInTheDocument()
  })

  it('shows a friendly empty state when nothing has happened yet', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderRecent()

    expect(await screen.findByText('Nothing has changed yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse the list/i })).toHaveAttribute('href', '/list')
    expect(screen.queryByRole('navigation', { name: 'Recent changes pages' })).toBeNull()
  })

  it('says which kind is empty and links back to everything', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderRecent('/recent?kind=level_moved')

    expect(await screen.findByText('No ranking moves yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Show all changes' })).toHaveAttribute(
      'href',
      '/recent',
    )
  })
})

describe('filter chips', () => {
  it('are links, with "All" marked as current by default', async () => {
    renderRecent()

    const links = within(filterNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'All',
      'Completions',
      'New levels',
      'Moves',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/recent',
      '/recent?kind=record',
      '/recent?kind=level_added',
      '/recent?kind=level_moved',
    ])
    expect(within(filterNav()).getByRole('link', { name: 'All' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(within(filterNav()).getByRole('link', { name: 'Moves' })).not.toHaveAttribute(
      'aria-current',
    )
    await dayList('Tuesday, Sep 1, 2026')
  })

  it('read the kind from the URL and only ask for that kind', async () => {
    renderRecent('/recent?kind=record')

    expect(within(filterNav()).getByRole('link', { name: 'Completions' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(await screen.findByText('5 completions')).toBeInTheDocument()
    expect(vi.mocked(getRecentChanges).mock.calls[0]?.[0]).toMatchObject({
      kind: 'record',
      page: 1,
    })
    // Only completions: no "was added" or "moved" lines.
    expect(screen.queryByText(/was added at/)).not.toBeInTheDocument()
    expect(screen.queryByText(/moved from/)).not.toBeInTheDocument()
  })

  it('ignore an unknown kind (shows everything)', async () => {
    renderRecent('/recent?kind=bogus')

    expect(within(filterNav()).getByRole('link', { name: 'All' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(await screen.findByText('13 changes')).toBeInTheDocument()
    expect(vi.mocked(getRecentChanges).mock.calls[0]?.[0]?.kind).toBeUndefined()
  })

  it('change the URL when clicked and start again at page 1', async () => {
    const { router } = renderRecent('/recent?page=2')
    await screen.findByRole('navigation', { name: 'Filter recent changes' })

    await act(async () => {
      fireEvent.click(within(filterNav()).getByRole('link', { name: 'Moves' }))
    })

    expect(router.state.location.search).toBe('?kind=level_moved')
    expect(await screen.findByText('2 moves')).toBeInTheDocument()
    expect(within(filterNav()).getByRole('link', { name: 'Moves' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })
})

describe('paging', () => {
  const ALL = manyChanges(65)

  beforeEach(() => {
    vi.mocked(getRecentChanges).mockImplementation(async (params = {}) => {
      const page = params.page ?? 1
      const size = params.pageSize ?? 30
      return {
        rows: ALL.slice((page - 1) * size, page * size),
        total: ALL.length,
      } satisfies Page<RecentChange>
    })
  })

  it('shows 30 per page and reads ?page=', async () => {
    renderRecent('/recent?page=2')

    expect(await screen.findByText('Showing 31–60 of 65 changes')).toBeInTheDocument()
    expect(vi.mocked(getRecentChanges).mock.calls[0]?.[0]).toMatchObject({ page: 2, pageSize: 30 })
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(30)
    const pager = screen.getByRole('navigation', { name: 'Recent changes pages' })
    expect(within(pager).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('moves between pages through the URL and keeps the filter', async () => {
    const { router } = renderRecent('/recent?kind=record')
    await screen.findByText('Showing 1–30 of 65 completions')
    const pager = screen.getByRole('navigation', { name: 'Recent changes pages' })

    await act(async () => {
      fireEvent.click(within(pager).getByRole('button', { name: 'Next page' }))
    })
    expect(router.state.location.search).toBe('?kind=record&page=2')
    expect(await screen.findByText('Showing 31–60 of 65 completions')).toBeInTheDocument()
    // Keyboard focus moves up to the summary line at the top of the new page.
    expect(screen.getByText('Showing 31–60 of 65 completions')).toHaveFocus()

    await act(async () => {
      fireEvent.click(within(pager).getByRole('button', { name: 'Page 1' }))
    })
    expect(router.state.location.search).toBe('?kind=record')
  })

  it('explains a page past the end and links to the last one', async () => {
    renderRecent('/recent?page=9')

    expect(await screen.findByText('There is no page 9')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the last page' })).toHaveAttribute(
      'href',
      '/recent?page=3',
    )
  })
})
