import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLevels } from '../api/levels'
import { getSettings } from '../api/settings'
import { getSiteStats } from '../api/stats'
import { HomePage } from '../pages/HomePage'
import {
  EMPTY_TEST_DATA,
  TEST_SETTINGS,
  apiNetworkError,
  mockApiDefaults,
  pendingForever,
} from './api-mocks'
import { renderWithProviders } from './render'

beforeEach(() => {
  mockApiDefaults()
})

afterEach(() => {
  document.title = ''
})

/**
 * "View all" links read "View all levels" in browsers (the rest is screen-reader text), but
 * jsdom's name calculation drops the space before the hidden part, so match the start only.
 */
const VIEW_ALL = /^view all/i

/** The value next to a stat tile's label ("Levels" → "6"). */
function totalValue(region: HTMLElement, label: string): string | null | undefined {
  return within(region).getByText(label).closest('dt')?.nextElementSibling?.textContent
}

async function findTotals() {
  const region = screen.getByRole('region', { name: 'Site totals' })
  await within(region).findByText('Levels')
  return region
}

describe('HomePage', () => {
  it('shows the hero with the site name from the settings and a link to the list', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...TEST_SETTINGS, site_name: 'Crate Club' })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Crate Club' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view the list/i })).toHaveAttribute('href', '/list')
    expect(screen.getByRole('link', { name: 'Players' })).toHaveAttribute('href', '/players')
    await waitFor(() => expect(document.title).toBe('Qwerty Crate'))
  })

  it('shows the built-in name while the settings load', () => {
    vi.mocked(getSettings).mockReturnValue(pendingForever())
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Qwerty Crate' })).toBeInTheDocument()
  })

  it('shows the site totals', async () => {
    renderWithProviders(<HomePage />)
    const totals = await findTotals()

    expect(totalValue(totals, 'Levels')).toBe('6')
    expect(totalValue(totals, 'Players')).toBe('3')
    expect(totalValue(totals, 'Records')).toBe('5')
    expect(totalValue(totals, 'Total attempts')).toBe('40,000')
  })

  it('shortens very big totals but keeps the exact number for screen readers', async () => {
    const stats = await getSiteStats()
    vi.mocked(getSiteStats).mockResolvedValue({ ...stats, totalAttempts: 1_234_567 })
    renderWithProviders(<HomePage />)
    const totals = await findTotals()

    const short = within(totals).getByText('1.2M')
    expect(short).toHaveAttribute('aria-hidden', 'true')
    expect(short).toHaveAttribute('title', '1,234,567')
    expect(within(totals).getByText('1,234,567')).toHaveClass('sr-only')
  })

  it('shows the top five levels as cards', async () => {
    renderWithProviders(<HomePage />)
    const top = screen.getByRole('region', { name: 'Top of the list' })

    await within(top).findByRole('link', { name: 'Sample Level 1' })
    const names = within(top)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(names).toEqual([1, 2, 3, 4, 5].map((n) => `Sample Level ${n}`))
    expect(within(top).getByRole('link', { name: 'Sample Level 3' })).toHaveAttribute(
      'href',
      '/level/sample-level-3',
    )
    expect(within(top).queryByRole('link', { name: 'Sample Level 6' })).not.toBeInTheDocument()
    expect(within(top).getByRole('link', { name: VIEW_ALL })).toHaveAttribute('href', '/list')
    expect(getLevels).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 5, page: 1, sort: 'position' }),
      expect.anything(),
    )
  })

  it('shows the top players, recent completions and latest changes', async () => {
    renderWithProviders(<HomePage />)

    const players = screen.getByRole('region', { name: 'Top players' })
    expect(await within(players).findByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )

    const completions = screen.getByRole('region', { name: 'Recent completions' })
    await waitFor(() =>
      expect(within(completions).getAllByRole('listitem').length).toBeGreaterThan(0),
    )
    expect(within(completions).getByRole('link', { name: VIEW_ALL })).toHaveAttribute(
      'href',
      '/recent?kind=record',
    )

    const changes = screen.getByRole('region', { name: 'Latest changes' })
    await waitFor(() => expect(within(changes).getAllByRole('listitem')).toHaveLength(5))
    expect(within(changes).getByRole('link', { name: VIEW_ALL })).toHaveAttribute('href', '/recent')
  })

  it('shows skeletons while loading', () => {
    vi.mocked(getLevels).mockReturnValue(pendingForever())
    vi.mocked(getSiteStats).mockReturnValue(pendingForever())
    renderWithProviders(<HomePage />)

    const top = screen.getByRole('region', { name: 'Top of the list' })
    expect(within(top).getByRole('list')).toHaveAttribute('aria-busy', 'true')
    expect(within(top).queryAllByRole('link', { name: /Sample Level/ })).toHaveLength(0)

    const totals = screen.getByRole('region', { name: 'Site totals' })
    expect(within(totals).queryByText('Levels')).not.toBeInTheDocument()
    expect(totals.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('shows an error with Try again when the top levels fail, then recovers', async () => {
    vi.mocked(getLevels).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<HomePage />)
    const top = screen.getByRole('region', { name: 'Top of the list' })

    expect(await within(top).findByRole('alert')).toHaveTextContent("Couldn't load the top levels")
    fireEvent.click(within(top).getByRole('button', { name: 'Try again' }))
    expect(await within(top).findByRole('link', { name: 'Sample Level 1' })).toBeInTheDocument()
  })

  it('shows an error with Try again when the totals fail, then recovers', async () => {
    vi.mocked(getSiteStats).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<HomePage />)
    const totals = screen.getByRole('region', { name: 'Site totals' })

    expect(await within(totals).findByRole('alert')).toHaveTextContent("Couldn't load the totals")
    fireEvent.click(within(totals).getByRole('button', { name: 'Try again' }))
    await within(totals).findByText('Levels')
    expect(totalValue(totals, 'Records')).toBe('5')
  })

  it('shows friendly empty states when there is nothing yet', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('No levels yet')).toBeInTheDocument()
    const totals = await findTotals()
    expect(totalValue(totals, 'Levels')).toBe('0')
    expect(totalValue(totals, 'Total attempts')).toBe('0')
    expect(await screen.findByText('No ranked players yet')).toBeInTheDocument()
    expect(await screen.findByText('No records yet')).toBeInTheDocument()
    expect(await screen.findByText('No changes yet')).toBeInTheDocument()
  })

  it('keeps the outline: one h1, then h2 sections', async () => {
    renderWithProviders(<HomePage />)
    await screen.findByRole('link', { name: 'Sample Level 1' })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections).toEqual([
      'Site totals',
      'Top of the list',
      'Top players',
      'Recent completions',
      'Latest changes',
    ])
  })
})
