import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings } from '../api/settings'
import { AboutPage } from '../pages/AboutPage'
import { TEST_SETTINGS, apiNetworkError, mockApiDefaults, pendingForever } from './api-mocks'
import { renderWithProviders } from './render'

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

function renderAbout() {
  return renderWithProviders(<AboutPage />, { route: '/about', path: '/about' })
}

const region = (name: string) => screen.getByRole('region', { name })

/** The rows of the "points per position" table as [position, section, points] texts. */
async function findPointsTable(): Promise<string[][]> {
  const table = await screen.findByRole('table', { name: /points per position/i })
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent ?? ''))
}

describe('AboutPage', () => {
  it('has the page title, heading and the "not affiliated" disclaimer', async () => {
    renderAbout()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'About Qwerty Crate' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('About — Qwerty Crate'))
    expect(region('The small print')).toHaveTextContent(
      'Not affiliated with RobTop Games or Pointercrate.',
    )
    expect(region('What this is')).toHaveTextContent("our friend group's own Geometry Dash list")
  })

  it('uses the site name from the settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...TEST_SETTINGS, site_name: 'Crate Club' })
    renderAbout()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'About Crate Club' }),
    ).toBeInTheDocument()
    expect(region('What this is')).toHaveTextContent("Crate Club is our friend group's own")
  })

  // Section links read "Main list" in browsers ("list" is screen-reader text), but jsdom's name
  // calculation drops the space before the hidden part, so they are matched by their start.
  it('shows the sections with the positions they cover right now', async () => {
    renderAbout()
    const ranking = region('How the ranking works')

    const main = await within(ranking).findByRole('link', { name: /^main/i })
    expect(main).toHaveAttribute('href', '/list?section=main')
    expect(within(ranking).getByRole('link', { name: /^extended/i })).toHaveAttribute(
      'href',
      '/list?section=extended',
    )
    const cards = within(ranking).getAllByRole('listitem')
    await waitFor(() => expect(cards[0]).toHaveTextContent('#1–3 · 3 spots'))
    expect(cards[1]).toHaveTextContent('#4–5 · 2 spots')
    expect(cards[2]).toHaveTextContent('#6 and below')
    expect(within(ranking).getByRole('link', { name: 'Recent changes' })).toHaveAttribute(
      'href',
      '/recent',
    )
  })

  it('shows the points formula with the current settings and example values', async () => {
    renderAbout()
    const points = region('How points work')

    expect(await findPointsTable()).toEqual([
      ['Rank #1', 'Main list', '250.00'],
      ['Rank #2', 'Main list', '237.50'],
      ['Rank #3', 'Main list', '225.63'],
      ['Rank #4', 'Extended list', '214.34'],
      ['Rank #5', 'Extended list', '203.63'],
      ['Rank #6', 'Legacy list', '0.00'],
    ])
    expect(
      within(points).getByText(/^With the current settings$/i).nextElementSibling,
    ).toHaveTextContent('points = max(5, 250 × 0.95 to the power of position − 1)')
    const tiles = within(points)
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])
    expect(tiles).toEqual([
      ['Top (#1)', '250.00'],
      ['Decay', '× 0.95'],
      ['Minimum', '5.00'],
      ['Earn points', '#1–5'],
    ])
    expect(points).toHaveTextContent('The last spot that earns points, #5, is worth 203.63 points.')
    expect(points).toHaveTextContent(
      'No level that earns points gets down to the minimum of 5.00 with these settings.',
    )
    expect(points).toHaveTextContent('Levels in Legacy, from #6 on, are always worth 0 points.')
    expect(within(points).getByRole('link', { name: 'players leaderboard' })).toHaveAttribute(
      'href',
      '/players',
    )
  })

  it('follows changed settings, including where the minimum starts', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...TEST_SETTINGS,
      main_list_size: 10,
      extended_list_size: 0,
      points_max: 100,
      points_decay: 0.9,
      points_min: 50,
    })
    renderAbout()
    const points = region('How points work')

    const rows = await findPointsTable()
    expect(rows.map(([position]) => position)).toEqual(
      [1, 2, 3, 5, 8, 10, 11].map((position) => `Rank #${position}`),
    )
    expect(rows.find(([position]) => position === 'Rank #8')?.[2]).toBe('50.00')
    expect(points).toHaveTextContent('points = max(50, 100 × 0.9')
    expect(points).toHaveTextContent(
      'From #8 to #10 the formula would drop below the minimum, so those levels are worth 50.00 points each.',
    )
    expect(within(region('How the ranking works')).getAllByRole('listitem')[1]).toHaveTextContent(
      'Empty right now',
    )
  })

  it('shows a skeleton while the settings load', () => {
    vi.mocked(getSettings).mockReturnValue(pendingForever())
    renderAbout()
    const points = region('How points work')

    expect(
      screen.getByRole('heading', { level: 1, name: 'About Qwerty Crate' }),
    ).toBeInTheDocument()
    expect(points.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(within(points).queryByRole('table')).not.toBeInTheDocument()
    expect(region('How the ranking works').querySelector('[aria-busy="true"]')).not.toBeNull()
    // The text that doesn't depend on the settings is there at once.
    expect(region('The small print')).toHaveTextContent('Not affiliated')
  })

  it('shows an error with Try again when the settings fail, then recovers', async () => {
    vi.mocked(getSettings).mockRejectedValueOnce(apiNetworkError())
    renderAbout()
    const points = region('How points work')

    expect(await within(points).findByRole('alert')).toHaveTextContent(
      "Couldn't load the current settings",
    )
    fireEvent.click(within(points).getByRole('button', { name: 'Try again' }))
    expect(await findPointsTable()).toHaveLength(6)
  })

  it('links to each section from "On this page" and moves focus there', async () => {
    const { router } = renderAbout()
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    const links = within(nav).getAllByRole('link')

    expect(links.map((link) => link.textContent)).toEqual([
      'What this is',
      'How the ranking works',
      'How points work',
      'The small print',
    ])
    expect(links[2]).toHaveAttribute('href', '/about#about-points')

    fireEvent.click(within(nav).getByRole('link', { name: 'How points work' }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2, name: 'How points work' }),
    )
    await waitFor(() => expect(router.state.location.hash).toBe('#about-points'))
    expect(router.state.location.pathname).toBe('/about')
  })

  it('keeps the outline: one h1, then h2 sections', async () => {
    renderAbout()
    await findPointsTable()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['What this is', 'How the ranking works', 'How points work', 'The small print'])
  })
})
