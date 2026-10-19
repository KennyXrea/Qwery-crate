import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLevels } from '../api/levels'
import { getPlayerBySlug } from '../api/players'
import { ListPage } from '../pages/ListPage'
import type { Level } from '../types/models'
import {
  apiNetworkError,
  EMPTY_TEST_DATA,
  mockApiDefaults,
  pendingForever,
  TEST_DATA,
  TEST_LEVELS,
  TEST_SETTINGS,
  testLevelId,
  testPlayerId,
} from './api-mocks'
import { renderWithProviders } from './render'

// The fake dataset (api-mocks.ts): Main = #1–3, Extended = #4–5, Legacy = #6+.
// Player Alpha beat levels 1, 2 and 4; Player Beta beat levels 1 and 3.

function renderList(route = '/list') {
  return renderWithProviders(<ListPage />, { route, path: '/list' })
}

/** The results in card view (an <ol> named after the section). */
async function findCards(section = 'Main') {
  return screen.findByRole('list', { name: new RegExp(`^${section} list levels`) })
}

function cardNames(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('heading')
    .map((heading) => heading.textContent ?? '')
}

/** The "3 levels in the Main list" line above the results. */
function resultSummary(): HTMLElement {
  return screen.getByText(
    (_, element) =>
      element?.tagName === 'P' &&
      element.getAttribute('role') === 'status' &&
      / in the \w+ list/.test(element.textContent ?? ''),
  )
}

function search(router: { state: { location: { search: string } } }): string {
  return router.state.location.search
}

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

describe('List page: basics', () => {
  it('shows the Main section as cards, with its title, tabs and result count', async () => {
    renderList()

    expect(screen.getByRole('heading', { level: 1, name: 'The List' })).toBeInTheDocument()
    expect(cardNames(await findCards())).toEqual([
      'Sample Level 1',
      'Sample Level 2',
      'Sample Level 3',
    ])
    expect(resultSummary()).toHaveTextContent('3 levels in the Main list')
    await waitFor(() => expect(document.title).toBe('The List — Qwerty Crate'))
  })

  it('shows each section with its range from the settings, the current one marked', async () => {
    renderList('/list?section=extended')

    const tabs = screen.getByRole('navigation', { name: 'List sections' })
    const extended = await within(tabs).findByRole('link', { name: /Extended/ })
    await waitFor(() => expect(extended).toHaveTextContent('#4–5'))
    expect(extended).toHaveAccessibleName('Extended, positions 4 to 5')
    expect(extended).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: /Main/ })).toHaveTextContent('#1–3')
    expect(within(tabs).getByRole('link', { name: /Legacy/ })).toHaveTextContent('#6+')
    expect(within(tabs).getByRole('link', { name: /Main/ })).not.toHaveAttribute('aria-current')

    expect(cardNames(await findCards('Extended'))).toEqual(['Sample Level 4', 'Sample Level 5'])
  })

  it('switches sections with the tabs, keeping the other filters and going back to page 1', async () => {
    const { router } = renderList('/list?view=table&sort=points&page=2')
    const tabs = screen.getByRole('navigation', { name: 'List sections' })

    fireEvent.click(within(tabs).getByRole('link', { name: /Legacy/ }))

    await waitFor(() => expect(search(router)).toBe('?section=legacy&sort=points&view=table'))
    const table = await screen.findByRole('table', { name: 'Legacy list levels' })
    expect(within(table).getByRole('link', { name: 'Sample Level 6' })).toBeInTheDocument()
  })

  it('has the sidebar with the list info, points formula and the three boxes', async () => {
    renderList()

    const sidebar = screen.getByRole('complementary', { name: 'About the list' })
    expect(within(sidebar).getByRole('heading', { name: 'About the list' })).toBeInTheDocument()
    const points = within(sidebar).getByRole('region', { name: 'How points work' })
    await waitFor(() => expect(points).toHaveTextContent('#1 is worth 250 points'))
    expect(points).toHaveTextContent('5% less (never under 5)')
    expect(within(points).getByRole('link', { name: /how points work/i })).toHaveAttribute(
      'href',
      '/about',
    )
    for (const title of ['Top players', 'Latest records', 'Latest changes']) {
      expect(within(sidebar).getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })
})

describe('List page: URL state', () => {
  it('reads every filter from the URL and asks the API for exactly that', async () => {
    renderList(
      '/list?section=main&q=sample&difficulty=extreme_demon&sort=points&view=table&player=player-alpha',
    )

    const table = await screen.findByRole('table', { name: 'Main list levels' })
    expect(within(table).getAllByRole('link', { name: /^Sample Level/ })).toHaveLength(2)
    expect(vi.mocked(getLevels)).toHaveBeenLastCalledWith(
      {
        section: 'main',
        search: 'sample',
        difficulty: 'extreme_demon',
        playerId: testPlayerId(1),
        sort: 'points',
        page: 1,
        pageSize: 25,
      },
      expect.anything(),
    )
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('sample')
    expect(screen.getByLabelText('Difficulty')).toHaveValue('extreme_demon')
    expect(screen.getByLabelText('Sort by')).toHaveValue('points')
    await waitFor(() => expect(screen.getByLabelText('Beaten by')).toHaveValue('player-alpha'))
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ignores unknown values instead of breaking', async () => {
    renderList('/list?section=bonus&difficulty=mythic&sort=random&view=grid&page=-4')

    expect(cardNames(await findCards())).toHaveLength(3)
    expect(vi.mocked(getLevels)).toHaveBeenLastCalledWith(
      { section: 'main', sort: 'position', page: 1, pageSize: 25 },
      expect.anything(),
    )
  })

  it('goes back to page 1 when a filter changes', async () => {
    const { router } = renderList('/list?view=table&page=3')
    // Page 3 is past the end of the fake list.
    expect(await screen.findByRole('heading', { name: "There's no page 3" })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'extreme_demon' } })

    await waitFor(() => expect(search(router)).toBe('?difficulty=extreme_demon&view=table'))
    const table = await screen.findByRole('table', { name: 'Main list levels' })
    expect(within(table).getAllByRole('link', { name: /^Sample Level/ })).toHaveLength(2)
  })

  it('keeps the page when only the view changes, and leaves out defaults', async () => {
    const { router } = renderList('/list?section=main&sort=position&page=2&view=cards')
    await screen.findByRole('heading', { name: "There's no page 2" })

    fireEvent.click(screen.getByRole('button', { name: 'Table' }))
    await waitFor(() => expect(search(router)).toBe('?view=table&page=2'))
  })

  it('changes the sort and the player filter through the selects', async () => {
    const { router } = renderList()
    await findCards()

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'enjoyment' } })
    await waitFor(() => expect(search(router)).toBe('?sort=enjoyment'))

    const player = screen.getByLabelText('Beaten by')
    await waitFor(() =>
      expect(within(player).getByRole('option', { name: 'Player Beta' })).toBeInTheDocument(),
    )
    // Player Gamma has no completions, so there is nothing to filter by.
    expect(within(player).queryByRole('option', { name: 'Player Gamma' })).toBeNull()
    fireEvent.change(player, { target: { value: 'player-beta' } })

    await waitFor(() => expect(search(router)).toBe('?player=player-beta&sort=enjoyment'))
    expect(cardNames(await findCards())).toEqual(['Sample Level 1', 'Sample Level 3'])
    expect(resultSummary()).toHaveTextContent('2 levels in the Main list beaten by Player Beta')
  })

  it('clears search, difficulty and player from the result line, keeping sort and view', async () => {
    const { router } = renderList('/list?q=sample&difficulty=extreme_demon&sort=points&page=1')
    expect(await findCards()).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(search(router)).toBe('?sort=points'))
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
  })

  it('has a phone "Filters & sort" button that shows how many are in use', async () => {
    renderList('/list?difficulty=hard&sort=points')
    const button = screen.getByRole('button', { name: /Filters & sort/ })

    expect(button).toHaveAccessibleName('Filters & sort (2 in use)')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')
    expect(panel).toContainElement(screen.getByLabelText('Difficulty'))

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('works with Back and Forward', async () => {
    const { router } = renderList()
    await findCards()

    fireEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(await screen.findByRole('table', { name: 'Main list levels' })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    expect(await findCards()).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true')

    await act(() => router.navigate(1))
    expect(await screen.findByRole('table', { name: 'Main list levels' })).toBeInTheDocument()
  })
})

describe('List page: search', () => {
  it('waits 300ms after typing before it updates the URL and the list', async () => {
    const { router } = renderList('/list?page=2')
    await screen.findByRole('heading', { name: "There's no page 2" })
    const box = screen.getByRole('searchbox', { name: 'Search' })

    fireEvent.change(box, { target: { value: '  level   2 ' } })
    expect(box).toHaveValue('  level   2 ')
    expect(search(router)).toBe('?page=2')

    await waitFor(() => expect(search(router)).toBe('?q=level+2'))
    expect(cardNames(await findCards())).toEqual(['Sample Level 2'])
    // The box keeps what was typed (not the tidied URL value).
    expect(box).toHaveValue('  level   2 ')
  })

  it('searches at once on Enter', async () => {
    const { router } = renderList()
    const box = screen.getByRole('searchbox', { name: 'Search' })

    fireEvent.change(box, { target: { value: 'level 3' } })
    fireEvent.submit(box.closest('form') as HTMLFormElement)

    expect(search(router)).toBe('?q=level+3')
    expect(cardNames(await findCards())).toEqual(['Sample Level 3'])
  })

  it('shows the search from the URL again after Back, and clears it with "Clear filters"', async () => {
    const { router } = renderList('/list?difficulty=extreme_demon')
    await findCards()
    const box = screen.getByRole('searchbox', { name: 'Search' })

    fireEvent.change(box, { target: { value: 'zzz' } })
    fireEvent.submit(box.closest('form') as HTMLFormElement)
    expect(await screen.findByRole('heading', { name: 'No levels match' })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    await waitFor(() => expect(box).toHaveValue(''))
    expect(cardNames(await findCards())).toHaveLength(2)

    await act(() => router.navigate(1))
    await waitFor(() => expect(box).toHaveValue('zzz'))

    await screen.findByRole('heading', { name: 'No levels match' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(search(router)).toBe(''))
    expect(box).toHaveValue('')
    expect(cardNames(await findCards())).toHaveLength(3)
  })

  it('explains that one character is not enough', async () => {
    renderList('/list?q=s')

    expect(await screen.findByText('Type at least 2 characters to search.')).toBeInTheDocument()
    expect(cardNames(await findCards())).toHaveLength(3)
  })
})

describe('List page: table view', () => {
  it('shows Rank | Level | Difficulty | Player | Points | Enjoyment', async () => {
    renderList('/list?view=table')

    const table = await screen.findByRole('table', { name: 'Main list levels' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Rank', 'Level', 'Difficulty', 'Player', 'Points', 'Enjoyment'])

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    const [first, , third] = rows as [HTMLElement, HTMLElement, HTMLElement]

    expect(within(first).getByRole('link', { name: 'Sample Level 1' })).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    expect(within(first).getByText('Rank')).toBeInTheDocument()
    expect(within(first).getByText('Extreme Demon')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(first).getByText('+1')).toBeInTheDocument()
    expect(within(first).getByText('and 1 more')).toBeInTheDocument()
    expect(within(first).getByText('250.00')).toBeInTheDocument()
    expect(within(first).getByText('8.0')).toBeInTheDocument()

    // Level 3: one victor (no "+N"), rated 6.5.
    expect(within(third).getByRole('link', { name: 'Player Beta' })).toBeInTheDocument()
    expect(within(third).queryByText(/^\+/)).toBeNull()
    expect(within(third).getByText('6.5')).toBeInTheDocument()
  })

  it('shows a dash for unrated levels and levels nobody has beaten', async () => {
    renderList('/list?view=table&section=extended')

    const table = await screen.findByRole('table', { name: 'Extended list levels' })
    const level5 = within(table).getAllByRole('row')[2] as HTMLElement
    expect(within(level5).getByRole('link', { name: 'Sample Level 5' })).toBeInTheDocument()
    expect(within(level5).getByText('Nobody yet')).toBeInTheDocument()
    expect(within(level5).getByText('Not rated yet')).toBeInTheDocument()
  })

  it('toggles between cards and table', async () => {
    const { router } = renderList()
    await findCards()
    const cards = screen.getByRole('button', { name: 'Cards' })
    const table = screen.getByRole('button', { name: 'Table' })
    expect(cards).toHaveAttribute('aria-pressed', 'true')
    expect(table).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(table)
    expect(await screen.findByRole('table', { name: 'Main list levels' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /list levels/ })).toBeNull()
    expect(search(router)).toBe('?view=table')
    expect(table).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(cards)
    expect(await findCards()).toBeInTheDocument()
    expect(search(router)).toBe('')
  })
})

describe('List page: player filter', () => {
  it('resolves the player slug to an id before asking for levels', async () => {
    renderList('/list?player=player-beta')

    expect(cardNames(await findCards())).toEqual(['Sample Level 1', 'Sample Level 3'])
    expect(vi.mocked(getPlayerBySlug)).toHaveBeenCalledWith('player-beta', expect.anything())
    // The unfiltered list was never asked for.
    for (const [params] of vi.mocked(getLevels).mock.calls) {
      expect(params).toMatchObject({ playerId: testPlayerId(2) })
    }
  })

  it('says when the player does not exist, with a way back', async () => {
    const { router } = renderList('/list?player=nobody-here')

    expect(await screen.findByRole('heading', { name: 'Player not found' })).toBeInTheDocument()
    expect(vi.mocked(getLevels)).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: "Show every player's levels" }))
    await waitFor(() => expect(search(router)).toBe(''))
    expect(cardNames(await findCards())).toHaveLength(3)
  })

  it('shows an error with Try again when the player cannot be loaded', async () => {
    vi.mocked(getPlayerBySlug).mockRejectedValueOnce(apiNetworkError())
    renderList('/list?player=player-beta')

    expect(
      await screen.findByRole('heading', { name: "Couldn't load that player" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(cardNames(await findCards())).toEqual(['Sample Level 1', 'Sample Level 3'])
  })
})

describe('List page: loading, error and empty states', () => {
  it('shows card skeletons while the first page loads', async () => {
    vi.mocked(getLevels).mockReturnValue(pendingForever())
    const { container } = renderList()

    expect(await screen.findByText('Loading levels…')).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('list', { name: /list levels/ })).toBeNull()
  })

  it('shows table skeletons in the table view', async () => {
    vi.mocked(getLevels).mockReturnValue(pendingForever())
    const { container } = renderList('/list?view=table')

    await screen.findByText('Loading levels…')
    expect(container.querySelector('[aria-hidden="true"] table')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('keeps the old rows on screen, marked as updating, while new ones load', async () => {
    const { router } = renderList()
    const list = await findCards()

    vi.mocked(getLevels).mockReturnValue(pendingForever())
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'points' } })

    await waitFor(() => expect(search(router)).toBe('?sort=points'))
    expect(await screen.findByText('Updating…')).toBeInTheDocument()
    expect(list).toBeInTheDocument()
    expect(list.closest('[aria-busy="true"]')).not.toBeNull()
  })

  it('shows an error with Try again', async () => {
    vi.mocked(getLevels).mockRejectedValueOnce(apiNetworkError())
    renderList()

    expect(await screen.findByRole('heading', { name: "Couldn't load the list" })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(cardNames(await findCards())).toHaveLength(3)
  })

  it('shows "No levels yet" when the list is empty', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderList()

    expect(await screen.findByRole('heading', { name: 'No levels yet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('shows an empty section by its name', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderList('/list?section=legacy')

    expect(await screen.findByRole('heading', { name: 'Nothing in Legacy yet' })).toBeVisible()
  })

  it('shows "No levels match" for filters without results, and clears them', async () => {
    const { router } = renderList('/list?difficulty=auto&view=table&sort=points')

    expect(await screen.findByRole('heading', { name: 'No levels match' })).toBeInTheDocument()
    // Only the empty state offers it (not the result line as well).
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(search(router)).toBe('?sort=points&view=table'))
    expect(await screen.findByRole('table', { name: 'Main list levels' })).toBeInTheDocument()
  })
})

describe('List page: pagination', () => {
  const manyLevels: Level[] = Array.from({ length: 30 }, (_, i) => ({
    ...(TEST_LEVELS[1] as Level),
    id: testLevelId(100 + i),
    position: i + 1,
    name: `Sample Level ${i + 1}`,
    slug: `sample-level-${i + 1}`,
    section: 'main',
  }))

  beforeEach(() => {
    mockApiDefaults({
      ...TEST_DATA,
      settings: { ...TEST_SETTINGS, main_list_size: 30 },
      levels: manyLevels,
    })
  })

  it('shows 25 per page with page numbers, previous and next', async () => {
    const { router } = renderList()

    expect(cardNames(await findCards())).toHaveLength(25)
    expect(resultSummary()).toHaveTextContent('1–25 of 30 levels')
    const pager = screen.getByRole('navigation', { name: 'List pages' })
    expect(within(pager).getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(pager).getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(search(router)).toBe('?page=2'))
    await waitFor(() =>
      expect(cardNames(screen.getByRole('list', { name: /^Main list levels/ }))).toEqual([
        'Sample Level 26',
        'Sample Level 27',
        'Sample Level 28',
        'Sample Level 29',
        'Sample Level 30',
      ]),
    )
    expect(resultSummary()).toHaveTextContent('26–30 of 30 levels')
    // Focus goes back to the top of the results.
    expect(resultSummary()).toHaveFocus()

    fireEvent.click(within(pager).getByRole('button', { name: 'Page 1' }))
    await waitFor(() => expect(search(router)).toBe(''))
  })

  it('offers the last page when the URL asks for one past the end', async () => {
    const { router } = renderList('/list?page=9')

    expect(await screen.findByRole('heading', { name: "There's no page 9" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }))
    await waitFor(() => expect(search(router)).toBe('?page=2'))
    expect(await screen.findByRole('list', { name: 'Main list levels, page 2 of 2' })).toBeVisible()
  })
})
