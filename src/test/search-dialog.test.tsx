import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  groupSearchResults,
  moveActiveIndex,
  resultsAnnouncement,
} from '../components/layout/search-utils'
import { searchSite } from '../api/search'
import type { SearchResult } from '../types/models'
import {
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
  testLevelId,
  testPlayerId,
} from './api-mocks'
import { renderApp } from './render'

// The whole app (header and all) with the fake dataset from api-mocks.ts: Sample Level 1–6 and
// Player Alpha / Beta / Gamma. Nothing touches the network.

const MIXED: SearchResult[] = [
  {
    kind: 'level',
    id: testLevelId(1),
    name: 'Sample Level 1',
    slug: 'sample-level-1',
    position: 1,
  },
  {
    kind: 'level',
    id: testLevelId(4),
    name: 'Sample Level 4',
    slug: 'sample-level-4',
    position: 4,
  },
  {
    kind: 'player',
    id: testPlayerId(1),
    name: 'Player Alpha',
    slug: 'player-alpha',
    position: null,
  },
  { kind: 'player', id: testPlayerId(2), name: 'Player Beta', slug: 'player-beta', position: null },
]

beforeEach(() => {
  mockApiDefaults()
})

async function openSearch(route = '/') {
  const result = renderApp(route)
  const banner = await screen.findByRole('banner')
  const button = within(banner).getByRole('button', { name: 'Search' })
  act(() => button.focus())
  fireEvent.click(button)
  const dialog = await screen.findByRole('dialog', { name: 'Search' })
  const input = within(dialog).getByRole('combobox', { name: 'Search levels and players' })
  return { ...result, button, dialog, input }
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

function press(input: HTMLElement, key: string) {
  fireEvent.keyDown(input, { key })
}

/** The option the field currently points at with aria-activedescendant. */
function activeOption(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

describe('search dialog', () => {
  it('asks for at least 2 characters before searching', async () => {
    const { input } = await openSearch()

    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('maxLength', '100')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAccessibleDescription(
      'Type at least 2 characters to search levels and players.',
    )

    type(input, ' a ')
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument()
    expect(searchSite).not.toHaveBeenCalled()
  })

  it('waits for a pause in typing, then searches once', async () => {
    const { input } = await openSearch()

    type(input, 'sa')
    type(input, 'sam')
    type(input, 'samp')

    expect(await screen.findByRole('option', { name: 'Sample Level 1, rank 1' })).toBeVisible()
    expect(searchSite).toHaveBeenCalledTimes(1)
    expect(vi.mocked(searchSite).mock.calls[0]?.[0]).toBe('samp')
  })

  it('groups results into Levels and Players', async () => {
    vi.mocked(searchSite).mockResolvedValue(MIXED)
    const { input } = await openSearch()

    type(input, 'pl')

    const listbox = await screen.findByRole('listbox', { name: 'Search results' })
    const levels = within(listbox).getByRole('group', { name: 'Levels' })
    const players = within(listbox).getByRole('group', { name: 'Players' })

    expect(
      within(levels)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Rank #1Sample Level 1', 'Rank #4Sample Level 4'])
    expect(within(levels).getByRole('option', { name: 'Sample Level 4, rank 4' })).toHaveAttribute(
      'href',
      '/level/sample-level-4',
    )
    expect(
      within(players)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['PAPlayer Alpha', 'PBPlayer Beta'])
    expect(within(players).getByRole('option', { name: 'Player Beta' })).toHaveAttribute(
      'href',
      '/player/player-beta',
    )

    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    // Screen readers hear how many results there are.
    expect(screen.getByText('4 results: 2 levels and 2 players')).toBeInTheDocument()
  })

  it('leaves out a group with no results', async () => {
    const { input } = await openSearch()

    type(input, 'player')

    const listbox = await screen.findByRole('listbox')
    await within(listbox).findByRole('option', { name: 'Player Alpha' })
    expect(within(listbox).getAllByRole('group')).toHaveLength(1)
    expect(within(listbox).queryByRole('group', { name: 'Levels' })).not.toBeInTheDocument()
  })

  it('moves the highlight with the arrow keys, wrapping around at both ends', async () => {
    vi.mocked(searchSite).mockResolvedValue(MIXED)
    const { input } = await openSearch()
    type(input, 'pl')
    const first = await screen.findByRole('option', { name: 'Sample Level 1, rank 1' })

    // The first result is highlighted straight away, so Enter opens it.
    expect(activeOption(input)).toBe(first)
    expect(first).toHaveAttribute('aria-selected', 'true')

    press(input, 'ArrowDown')
    expect(activeOption(input)).toHaveAccessibleName('Sample Level 4, rank 4')
    expect(first).toHaveAttribute('aria-selected', 'false')

    press(input, 'ArrowDown')
    press(input, 'ArrowDown')
    expect(activeOption(input)).toHaveAccessibleName('Player Beta')

    press(input, 'ArrowDown')
    expect(activeOption(input)).toBe(first)

    press(input, 'ArrowUp')
    expect(activeOption(input)).toHaveAccessibleName('Player Beta')
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
    // Focus never leaves the field.
    expect(input).toHaveFocus()
  })

  it('opens the highlighted result with Enter and closes', async () => {
    vi.mocked(searchSite).mockResolvedValue(MIXED)
    const { input, router } = await openSearch()
    type(input, 'pl')
    await screen.findByRole('option', { name: 'Player Alpha' })

    press(input, 'ArrowUp')
    press(input, 'ArrowUp')
    expect(activeOption(input)).toHaveAccessibleName('Player Alpha')
    await act(async () => press(input, 'Enter'))

    expect(router.state.location.pathname).toBe('/player/player-alpha')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens the top result when Enter is pressed before the results are in', async () => {
    const { input, router } = await openSearch()

    type(input, 'sample level 2')
    press(input, 'Enter')
    expect(router.state.location.pathname).toBe('/')

    await waitFor(() => expect(router.state.location.pathname).toBe('/level/sample-level-2'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('highlights a result on hover and opens it on click', async () => {
    vi.mocked(searchSite).mockResolvedValue(MIXED)
    const { input, router } = await openSearch()
    type(input, 'pl')
    const beta = await screen.findByRole('option', { name: 'Player Beta' })

    fireEvent.mouseMove(beta)
    expect(activeOption(input)).toBe(beta)

    await act(async () => fireEvent.click(beta))

    expect(router.state.location.pathname).toBe('/player/player-beta')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes on any navigation, e.g. Back', async () => {
    const { router } = renderApp('/list')
    await act(() => router.navigate('/players'))
    const banner = await screen.findByRole('banner')
    fireEvent.click(within(banner).getByRole('button', { name: 'Search' }))
    await screen.findByRole('dialog', { name: 'Search' })

    await act(() => router.navigate(-1))

    expect(router.state.location.pathname).toBe('/list')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('stays open while nothing navigates', async () => {
    const { input } = await openSearch()
    type(input, 'sample')
    await screen.findByRole('option', { name: 'Sample Level 1, rank 1' })

    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
  })

  it('closes with Escape and gives focus back to the search button', async () => {
    const { input, button } = await openSearch()
    type(input, 'sample')

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('starts empty every time it opens', async () => {
    const { input, button } = await openSearch()
    type(input, 'sample')
    fireEvent.keyDown(input, { key: 'Escape' })

    fireEvent.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Search' })
    expect(within(dialog).getByRole('combobox')).toHaveValue('')
  })

  it('says "Searching…" while the first results load', async () => {
    vi.mocked(searchSite).mockReturnValue(pendingForever())
    const { input } = await openSearch()

    type(input, 'sample')

    expect(screen.getByText('Searching…')).toBeInTheDocument()
    await waitFor(() => expect(searchSite).toHaveBeenCalled())
    expect(screen.getByText('Searching…')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('says when nothing matches', async () => {
    const { input } = await openSearch()

    type(input, 'zzz')

    expect(await screen.findByText('No results for “zzz”')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('shows an error with Try again', async () => {
    vi.mocked(searchSite).mockRejectedValueOnce(apiNetworkError())
    const { dialog, input } = await openSearch()

    type(input, 'sample')

    const title = await within(dialog).findByText("Search isn't working right now")
    const alert = title.closest('[role="alert"]') as HTMLElement
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('option', { name: 'Sample Level 1, rank 1' })).toBeVisible()
  })
})

describe('search helpers', () => {
  it('groups results by kind, keeps their order and links each one', () => {
    const reversed = [MIXED[2], MIXED[0], MIXED[3], MIXED[1]] as SearchResult[]
    const { levels, players, options } = groupSearchResults(reversed)

    expect(levels.map((option) => option.path)).toEqual([
      '/level/sample-level-1',
      '/level/sample-level-4',
    ])
    expect(players.map((option) => option.path)).toEqual([
      '/player/player-alpha',
      '/player/player-beta',
    ])
    // Levels first, then players: the order ↑ / ↓ walk through.
    expect(options.map((option) => option.result.name)).toEqual([
      'Sample Level 1',
      'Sample Level 4',
      'Player Alpha',
      'Player Beta',
    ])
    expect(new Set(options.map((option) => option.key)).size).toBe(4)
  })

  it('drops duplicate results', () => {
    expect(groupSearchResults([...MIXED, ...MIXED]).options).toHaveLength(4)
    expect(groupSearchResults([]).options).toEqual([])
  })

  it('moves the active index with wrap-around', () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0)
    expect(moveActiveIndex(-1, -1, 3)).toBe(2)
    expect(moveActiveIndex(0, 1, 3)).toBe(1)
    expect(moveActiveIndex(2, 1, 3)).toBe(0)
    expect(moveActiveIndex(0, -1, 3)).toBe(2)
    expect(moveActiveIndex(7, 1, 3)).toBe(0)
    expect(moveActiveIndex(0, 1, 0)).toBe(-1)
  })

  it('describes the results for screen readers', () => {
    expect(resultsAnnouncement(0, 0)).toBe('No results')
    expect(resultsAnnouncement(1, 0)).toBe('1 result: 1 level')
    expect(resultsAnnouncement(0, 2)).toBe('2 results: 2 players')
    expect(resultsAnnouncement(3, 1)).toBe('4 results: 3 levels and 1 player')
  })
})
