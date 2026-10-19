import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DifficultyChart } from '../components/stats/DifficultyChart'
import { HardestPerPlayerList } from '../components/stats/HardestPerPlayerList'
import { MonthlyCompletionsChart } from '../components/stats/MonthlyCompletionsChart'
import { SiteTotals } from '../components/stats/SiteTotals'
import { CHART_MONTHS, monthIndexOf } from '../components/stats/stats-utils'
import { TopLevelsList } from '../components/stats/TopLevelsList'
import { countDifficulties } from '../api/stats'
import type { MonthCount } from '../types/models'
import { TEST_LEVELS, TEST_PLAYERS } from './api-mocks'
import { renderWithProviders } from './render'

const month = (key: string) => {
  const index = monthIndexOf(key)
  if (index === null) throw new Error(`bad month ${key}`)
  return index
}

/** 'YYYY-MM' for a month index. */
const key = (index: number) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`

/** The rows of the "Show as a table" table, as [month, count] text pairs. */
function tableRows(): string[][] {
  const table = screen.getByRole('table', { name: /completions per month/i })
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent ?? ''))
}

describe('SiteTotals', () => {
  it('shows the four totals as label/value pairs', () => {
    const { container } = renderWithProviders(
      <SiteTotals stats={{ levels: 12, players: 6, records: 26, totalAttempts: 45_678 }} />,
    )
    expect(container.querySelector('dl')).toHaveAttribute('aria-label', 'Site totals')
    const pairs = screen
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])
    expect(pairs).toEqual([
      ['Levels', '12'],
      ['Players', '6'],
      ['Records', '26'],
      ['Total attempts', '45,678'],
    ])
  })
})

describe('DifficultyChart', () => {
  it('lists every demon difficulty hardest first, with counts and shares in words', () => {
    const distribution = countDifficulties(TEST_LEVELS.map((level) => level.difficulty))
    renderWithProviders(<DifficultyChart distribution={distribution} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('.sr-only')?.textContent)).toEqual([
      ': 2 levels, 33% of the list',
      ': 1 level, 17% of the list',
      ': 1 level, 17% of the list',
      ': 1 level, 17% of the list',
      ': 1 level, 17% of the list',
    ])
    expect(rows[0]).toHaveTextContent(/^Extreme Demon/)
    expect(rows[4]).toHaveTextContent(/^Easy Demon/)
  })

  it('draws each bar against the biggest row and adds easier difficulties only when used', () => {
    renderWithProviders(
      <DifficultyChart
        distribution={[
          { difficulty: 'extreme_demon', count: 4 },
          { difficulty: 'insane', count: 1 },
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(6)
    const widths = rows.map(
      (row) => row.querySelector<HTMLElement>('[aria-hidden="true"] > div')?.style.width,
    )
    expect(widths).toEqual(['100%', '0%', '0%', '0%', '0%', '25%'])
    expect(rows[5]).toHaveTextContent('Insane')
    expect(rows[5]).toHaveTextContent('1 level, 20% of the list')
  })
})

describe('MonthlyCompletionsChart', () => {
  const months: MonthCount[] = [
    { month: '2026-01', count: 1 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 2 },
  ]

  it('sums it up in words and draws one column per month up to the current month', () => {
    const { container } = renderWithProviders(
      <MonthlyCompletionsChart months={months} undated={1} currentMonth={month('2026-04')} />,
    )

    expect(screen.getByText(/Busiest month:/)).toHaveTextContent(
      '3 completions with a date. Busiest month: March 2026 with 2.',
    )
    expect(screen.getByText(/without a date/)).toHaveTextContent(
      "1 completion without a date isn't counted here.",
    )
    const columns = container.querySelectorAll('[data-month]')
    expect([...columns].map((column) => Number(column.getAttribute('data-month')))).toEqual([
      month('2026-01'),
      month('2026-02'),
      month('2026-03'),
      month('2026-04'),
    ])
    // Four columns: every non-zero one gets its value on the cap.
    expect([...columns].map((column) => column.textContent)).toEqual(['1', '', '2', ''])
    // The picture is hidden from screen readers (the summary and the table say it all).
    expect(container.querySelector('[data-month]')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('lists every month with completions in a table, newest first, plus the undated ones', () => {
    renderWithProviders(
      <MonthlyCompletionsChart months={months} undated={1} currentMonth={month('2026-04')} />,
    )
    const toggle = screen.getByText('Show as a table')
    const details = toggle.closest('details')
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(toggle)
    expect(details).toHaveAttribute('open')

    expect(tableRows()).toEqual([
      ['March 2026', '2'],
      ['January 2026', '1'],
      ['No date', '1'],
    ])
  })

  it('shows the exact count of the column under the pointer', () => {
    const { container } = renderWithProviders(
      <MonthlyCompletionsChart months={months} undated={0} currentMonth={month('2026-04')} />,
    )
    const january = container.querySelector(`[data-month="${month('2026-01')}"]`)
    if (!january) throw new Error('no January column')

    expect(screen.queryByText(/completion · Jan 2026/)).not.toBeInTheDocument()
    fireEvent.pointerEnter(january)
    expect(screen.getByText(/completion · Jan 2026/).textContent).toBe('1 completion · Jan 2026')
  })

  it(`keeps the chart to the last ${CHART_MONTHS} months, labels only the peak, and says what is left out`, () => {
    const end = month('2026-10')
    const long = Array.from({ length: 30 }, (_, i) => ({
      month: key(end - 29 + i),
      count: i === 20 ? 5 : 1,
    }))
    const { container } = renderWithProviders(
      <MonthlyCompletionsChart months={long} undated={0} currentMonth={end} />,
    )

    const columns = [...container.querySelectorAll('[data-month]')]
    expect(columns).toHaveLength(CHART_MONTHS)
    expect(columns.filter((column) => column.textContent !== '').map((c) => c.textContent)).toEqual(
      ['5'],
    )
    expect(
      screen.getByText(
        /The chart shows the last 24 months; 6 older completions are in the table\./,
      ),
    ).toBeInTheDocument()
    // The table still has all 30 months.
    expect(tableRows()).toHaveLength(30)
  })

  it('shows an empty state without dated completions, mentioning the undated ones', () => {
    renderWithProviders(<MonthlyCompletionsChart months={[]} undated={2} />)

    expect(screen.getByText('No dated completions yet')).toBeInTheDocument()
    expect(
      screen.getByText("2 completions without a date aren't counted here."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('TopLevelsList', () => {
  const rated = TEST_LEVELS.filter((level) => level.avg_enjoyment !== null)

  it('ranks levels by enjoyment out of 10, each row one link to the level', () => {
    renderWithProviders(<TopLevelsList levels={rated} metric="enjoyment" />)

    const rows = screen.getAllByRole('listitem')
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual([
      'Sample Level 1',
      'Sample Level 2',
      'Sample Level 3',
    ])
    expect(within(rows[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    expect(rows[0]).toHaveTextContent('#1')
    expect(rows[0]).toHaveTextContent('8.0/10 out of 10 average enjoyment')
    expect(rows[2]).toHaveTextContent('6.5/10')
  })

  it('shows average attempts, with bars measured against the top entry', () => {
    const tried = TEST_LEVELS.filter((level) => level.avg_attempts !== null)
    renderWithProviders(<TopLevelsList levels={tried} metric="attempts" />)

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('13,000 avg attempts on average')
    expect(rows[1]).toHaveTextContent('9,000')
    const widths = rows.map(
      (row) => row.querySelector<HTMLElement>('[aria-hidden="true"] > div')?.style.width,
    )
    expect(widths[0]).toBe('100%')
    expect(Number.parseFloat(widths[2] ?? '')).toBeCloseTo((5000 / 13000) * 100, 5)
  })

  it('has a friendly empty state for each metric', () => {
    const unrated = TEST_LEVELS.filter((level) => level.avg_enjoyment === null)
    const { unmount } = renderWithProviders(<TopLevelsList levels={unrated} metric="enjoyment" />)
    expect(screen.getByText('No ratings yet')).toBeInTheDocument()
    unmount()

    renderWithProviders(<TopLevelsList levels={[]} metric="attempts" />)
    expect(screen.getByText('No attempt counts yet')).toBeInTheDocument()
  })
})

describe('HardestPerPlayerList', () => {
  it('lists players with completions, hardest level first, linking the player and the level', () => {
    renderWithProviders(<HardestPerPlayerList players={TEST_PLAYERS} total={3} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    const [alpha] = rows
    if (!alpha) throw new Error('no rows')
    expect(within(alpha).getByRole('link', { name: 'Player Alpha' })).toHaveAttribute(
      'href',
      '/player/player-alpha',
    )
    expect(within(alpha).getByRole('link', { name: 'Sample Level 1' })).toHaveAttribute(
      'href',
      '/level/sample-level-1',
    )
    expect(alpha).toHaveTextContent('3 completions')
    expect(screen.queryByText('Player Gamma')).not.toBeInTheDocument()
    // Everyone fits on this page, so there's no "Showing the … players" note.
    expect(screen.queryByText(/highest-ranked players/)).not.toBeInTheDocument()
  })

  it('says when only part of the leaderboard was read', () => {
    renderWithProviders(<HardestPerPlayerList players={TEST_PLAYERS} total={250} />)
    expect(screen.getByText('Showing the 3 highest-ranked players.')).toBeInTheDocument()
  })

  it('shows an empty state when nobody has a completion', () => {
    const [, , gamma] = TEST_PLAYERS
    renderWithProviders(<HardestPerPlayerList players={gamma ? [gamma] : []} />)
    expect(screen.getByText('No completions yet')).toBeInTheDocument()
  })
})
