import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlayers } from '../api/players'
import { getSiteStats } from '../api/stats'
import { StatsPage } from '../pages/StatsPage'
import { EMPTY_TEST_DATA, apiNetworkError, mockApiDefaults, pendingForever } from './api-mocks'
import { renderWithProviders } from './render'

beforeEach(() => {
  mockApiDefaults()
  // Only Date is faked (React Query's timers stay real): the month chart runs up to "now".
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 3, 15, 12))
})

afterEach(() => {
  vi.useRealTimers()
  document.title = ''
})

const region = (name: string) => screen.getByRole('region', { name })

/** The value next to a stat tile's label ("Levels" → "6"). */
function totalValue(container: HTMLElement, label: string): string | null | undefined {
  return within(container).getByText(label).closest('dt')?.nextElementSibling?.textContent
}

async function findLoaded() {
  await screen.findByRole('region', { name: 'Totals' })
}

describe('StatsPage', () => {
  it('has the page title and heading', async () => {
    renderWithProviders(<StatsPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Stats' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Stats — Qwerty Crate'))
    await findLoaded()
  })

  it('shows the totals', async () => {
    renderWithProviders(<StatsPage />)
    await findLoaded()
    const totals = region('Totals')

    expect(totalValue(totals, 'Levels')).toBe('6')
    expect(totalValue(totals, 'Players')).toBe('3')
    expect(totalValue(totals, 'Records')).toBe('5')
    expect(totalValue(totals, 'Total attempts')).toBe('40,000')
  })

  it('charts the levels by difficulty, hardest first, with the numbers written out', async () => {
    renderWithProviders(<StatsPage />)
    await findLoaded()
    const chart = region('Levels by difficulty')

    expect(chart).toHaveTextContent('In-game difficulty of the 6 levels on the list')
    const rows = within(chart).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('Extreme Demon')
    expect(rows[0]).toHaveTextContent('2 levels, 33% of the list')
    expect(rows[1]).toHaveTextContent('Insane Demon')
    expect(rows[1]).toHaveTextContent('1 level, 17% of the list')
  })

  it('charts the completions per month with a summary and a table', async () => {
    renderWithProviders(<StatsPage />)
    await findLoaded()
    const chart = region('Completions per month')

    expect(within(chart).getByText(/Busiest month:/)).toHaveTextContent(
      '4 completions with a date. Busiest month: March 2026 with 2.',
    )
    expect(chart).toHaveTextContent("1 completion without a date isn't counted here.")
    // January to April 2026 (the current month).
    expect(chart.querySelectorAll('[data-month]')).toHaveLength(4)

    fireEvent.click(within(chart).getByText('Show as a table'))
    const table = within(chart).getByRole('table')
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent))
    expect(rows).toEqual([
      ['March 2026', '2'],
      ['February 2026', '1'],
      ['January 2026', '1'],
      ['No date', '1'],
    ])
  })

  it('lists the most enjoyed levels and the levels with the most attempts', async () => {
    renderWithProviders(<StatsPage />)
    await findLoaded()

    const enjoyed = region('Most enjoyed levels')
    expect(
      within(enjoyed)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Sample Level 1', 'Sample Level 2', 'Sample Level 3'])
    expect(within(enjoyed).getAllByRole('listitem')[0]).toHaveTextContent('8.0/10')

    const attempts = region('Most attempts')
    expect(within(attempts).getByRole('link', { name: 'Sample Level 2' })).toHaveAttribute(
      'href',
      '/level/sample-level-2',
    )
    expect(within(attempts).getAllByRole('listitem')[0]).toHaveTextContent('13,000')
  })

  it('shows each player’s hardest level from the leaderboard', async () => {
    renderWithProviders(<StatsPage />)
    const hardest = region('Hardest level per player')

    const alpha = await within(hardest).findByRole('link', { name: 'Player Alpha' })
    expect(alpha).toHaveAttribute('href', '/player/player-alpha')
    expect(within(hardest).getByRole('link', { name: 'Player Beta' })).toBeInTheDocument()
    expect(within(hardest).queryByText('Player Gamma')).not.toBeInTheDocument()
    expect(within(hardest).getAllByRole('link', { name: 'Sample Level 1' })).toHaveLength(2)
    expect(within(hardest).getByRole('link', { name: /^view all/i })).toHaveAttribute(
      'href',
      '/players',
    )
    expect(getPlayers).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 100 }),
      expect.anything(),
    )
  })

  it('shows skeletons shaped like the sections while loading', () => {
    vi.mocked(getSiteStats).mockReturnValue(pendingForever())
    vi.mocked(getPlayers).mockReturnValue(pendingForever())
    const { container } = renderWithProviders(<StatsPage />)

    expect(screen.getByText('Loading the stats…')).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Levels by difficulty',
      'Completions per month',
      'Most enjoyed levels',
      'Most attempts',
      'Hardest level per player',
    ])
    expect(screen.queryByText('Levels')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Sample Level/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Player/ })).not.toBeInTheDocument()
  })

  it('shows an error with Try again when the stats fail, then recovers', async () => {
    vi.mocked(getSiteStats).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<StatsPage />)

    // (Scoped to the error itself: the toast area is an empty alert region too.)
    const alert = (await screen.findByText("Couldn't load the stats")).closest('[role="alert"]')
    if (!(alert instanceof HTMLElement)) throw new Error('the error is not an alert')
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    await findLoaded()
    expect(totalValue(region('Totals'), 'Records')).toBe('5')
  })

  it('shows its own error for the hardest levels when the leaderboard fails', async () => {
    vi.mocked(getPlayers).mockRejectedValueOnce(apiNetworkError())
    renderWithProviders(<StatsPage />)
    const hardest = region('Hardest level per player')

    expect(await within(hardest).findByRole('alert')).toHaveTextContent("Couldn't load the players")
    // The rest of the page still loads.
    await findLoaded()
    fireEvent.click(within(hardest).getByRole('button', { name: 'Try again' }))
    expect(await within(hardest).findByRole('link', { name: 'Player Alpha' })).toBeInTheDocument()
  })

  it('shows a friendly empty state when there is nothing to count', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    renderWithProviders(<StatsPage />)

    expect(await screen.findByText('Nothing to count yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view the list/i })).toHaveAttribute('href', '/list')
    expect(
      screen.queryByRole('heading', { name: 'Hardest level per player' }),
    ).not.toBeInTheDocument()
  })

  it('shows empty states inside the sections that have no data yet', async () => {
    const stats = await getSiteStats()
    vi.mocked(getSiteStats).mockResolvedValue({
      ...stats,
      completionsPerMonth: [],
      undatedCompletions: 5,
      mostEnjoyed: [],
      mostAttempts: [],
    })
    renderWithProviders(<StatsPage />)
    await findLoaded()

    expect(region('Completions per month')).toHaveTextContent('No dated completions yet')
    expect(region('Completions per month')).toHaveTextContent(
      "5 completions without a date aren't counted here.",
    )
    expect(region('Most enjoyed levels')).toHaveTextContent('No ratings yet')
    expect(region('Most attempts')).toHaveTextContent('No attempt counts yet')
  })

  it('keeps the outline: one h1, then h2 sections', async () => {
    renderWithProviders(<StatsPage />)
    await findLoaded()
    await within(region('Hardest level per player')).findByRole('link', { name: 'Player Alpha' })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Totals',
      'Levels by difficulty',
      'Completions per month',
      'Most enjoyed levels',
      'Most attempts',
      'Hardest level per player',
    ])
  })
})
