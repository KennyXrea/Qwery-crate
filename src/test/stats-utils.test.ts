import { describe, expect, it } from 'vitest'
import {
  CHART_MONTHS,
  LABEL_EVERY_COLUMN_UP_TO,
  capLabelIndexes,
  currentMonthIndex,
  difficultyRows,
  formatCompactNumber,
  formatShare,
  hardestPerPlayer,
  longMonthLabel,
  mediumMonthLabel,
  monthAxisLabel,
  monthIndexOf,
  monthParts,
  monthlySeries,
  niceScale,
  percentOf,
  shortMonthLabel,
} from '../components/stats/stats-utils'
import { countDifficulties } from '../api/stats'
import type { Player } from '../types/models'
import { TEST_PLAYERS } from './api-mocks'

const month = (key: string) => {
  const index = monthIndexOf(key)
  if (index === null) throw new Error(`bad month ${key}`)
  return index
}

describe('formatCompactNumber', () => {
  it('keeps numbers below 100,000 exact', () => {
    expect(formatCompactNumber(0)).toBe('0')
    expect(formatCompactNumber(40000)).toBe('40,000')
    expect(formatCompactNumber(99999)).toBe('99,999')
  })

  it('shortens big numbers', () => {
    expect(formatCompactNumber(100000)).toBe('100K')
    expect(formatCompactNumber(322512)).toBe('322.5K')
    expect(formatCompactNumber(1_234_567)).toBe('1.2M')
  })

  it('reads numeric strings and shows a dash for junk', () => {
    expect(formatCompactNumber('250000')).toBe('250K')
    expect(formatCompactNumber(null)).toBe('—')
    expect(formatCompactNumber('abc')).toBe('—')
  })
})

describe('formatShare and percentOf', () => {
  it('formats shares as whole percents, with "<1%" for tiny ones', () => {
    expect(formatShare(1 / 3)).toBe('33%')
    expect(formatShare(1)).toBe('100%')
    expect(formatShare(0)).toBe('0%')
    expect(formatShare(0.001)).toBe('<1%')
    expect(formatShare(Number.NaN)).toBe('0%')
    expect(formatShare(2)).toBe('100%')
  })

  it('turns a value and a maximum into a CSS percentage between 0% and 100%', () => {
    expect(percentOf(5, 10)).toBe('50%')
    expect(percentOf(10, 10)).toBe('100%')
    expect(percentOf(20, 10)).toBe('100%')
    expect(percentOf(0, 10)).toBe('0%')
    expect(percentOf(3, 0)).toBe('0%')
    expect(percentOf(-1, 10)).toBe('0%')
  })
})

describe('difficultyRows', () => {
  it('lists hardest first, always shows the demons and only used easier difficulties', () => {
    const rows = difficultyRows(
      countDifficulties(['extreme_demon', 'extreme_demon', 'hard_demon', 'insane']),
    )
    expect(rows.map((row) => row.difficulty)).toEqual([
      'extreme_demon',
      'insane_demon',
      'hard_demon',
      'medium_demon',
      'easy_demon',
      'insane',
    ])
    expect(rows[0]).toEqual({ difficulty: 'extreme_demon', count: 2, share: 0.5, ratio: 1 })
    expect(rows[1]).toMatchObject({ count: 0, share: 0, ratio: 0 })
    expect(rows[2]).toMatchObject({ count: 1, share: 0.25, ratio: 0.5 })
  })

  it('works without any levels and ignores bad counts', () => {
    const rows = difficultyRows([
      { difficulty: 'easy', count: Number.NaN },
      { difficulty: 'hard', count: -2 },
    ])
    expect(rows).toHaveLength(5)
    expect(rows.every((row) => row.count === 0 && row.share === 0 && row.ratio === 0)).toBe(true)
  })

  it('does not depend on the order or duplicates of the input', () => {
    const rows = difficultyRows([
      { difficulty: 'easy_demon', count: 1 },
      { difficulty: 'extreme_demon', count: 1 },
      { difficulty: 'easy_demon', count: 2 },
    ])
    expect(rows[0]).toMatchObject({ difficulty: 'extreme_demon', count: 1 })
    expect(rows[4]).toMatchObject({ difficulty: 'easy_demon', count: 3, ratio: 1, share: 0.75 })
  })
})

describe('months', () => {
  it('converts between "YYYY-MM" and month indexes', () => {
    expect(monthIndexOf('2026-03')).toBe(2026 * 12 + 2)
    expect(monthParts(2026 * 12 + 2)).toEqual({ year: 2026, month: 3 })
    expect(monthIndexOf('2026-13')).toBeNull()
    expect(monthIndexOf('2026-00')).toBeNull()
    expect(monthIndexOf('March')).toBeNull()
  })

  it('reads the current month in local time', () => {
    expect(currentMonthIndex(new Date(2026, 9, 8))).toBe(month('2026-10'))
    expect(currentMonthIndex(new Date(2027, 0, 1))).toBe(month('2027-01'))
  })

  it('names months', () => {
    expect(shortMonthLabel(month('2026-03'))).toBe('Mar')
    expect(mediumMonthLabel(month('2026-03'))).toBe('Mar 2026')
    expect(longMonthLabel(month('2026-03'))).toBe('March 2026')
    // Years below 100 stay themselves (Date.UTC would make 0050 into 1950).
    expect(longMonthLabel(month('0050-01'))).toBe('January 50')
  })

  it('labels every month up to 12 columns, then only quarters; January shows the year', () => {
    expect(monthAxisLabel(month('2026-02'), 12)).toBe('Feb')
    expect(monthAxisLabel(month('2026-01'), 12)).toBe('2026')
    expect(monthAxisLabel(month('2026-02'), 13)).toBeNull()
    expect(monthAxisLabel(month('2026-04'), 24)).toBe('Apr')
    expect(monthAxisLabel(month('2027-01'), 24)).toBe('2027')
  })
})

describe('monthlySeries', () => {
  const months = [
    { month: '2026-01', count: 1 },
    { month: '2026-02', count: 1 },
    { month: '2026-03', count: 2 },
  ]

  it('runs from the first completion to the current month, filling gaps with 0', () => {
    const series = monthlySeries(months, month('2026-05'))
    expect(series.bins).toEqual([
      { index: month('2026-01'), count: 1 },
      { index: month('2026-02'), count: 1 },
      { index: month('2026-03'), count: 2 },
      { index: month('2026-04'), count: 0 },
      { index: month('2026-05'), count: 0 },
    ])
    expect(series).toMatchObject({ max: 2, total: 4, hiddenBefore: 0 })
    expect(series.busiest).toEqual({ index: month('2026-03'), count: 2 })
  })

  it('runs up to the last completion when it is dated after the current month', () => {
    const series = monthlySeries(months, month('2025-12'))
    expect(series.bins.at(-1)?.index).toBe(month('2026-03'))
    expect(series.bins).toHaveLength(3)
  })

  it('shows at most the most recent months and counts the older completions', () => {
    const series = monthlySeries(
      [
        { month: '2020-01', count: 3 },
        { month: '2026-01', count: 1 },
      ],
      month('2026-03'),
    )
    expect(series.bins).toHaveLength(CHART_MONTHS)
    expect(series.bins[0]?.index).toBe(month('2024-04'))
    expect(series.bins.at(-1)?.index).toBe(month('2026-03'))
    expect(series.hiddenBefore).toBe(3)
    expect(series.total).toBe(4)
    // The busiest month can be outside the window.
    expect(series.busiest).toEqual({ index: month('2020-01'), count: 3 })
    expect(series.max).toBe(1)
  })

  it('takes the earliest month on a tie and adds up repeated months', () => {
    const series = monthlySeries(
      [
        { month: '2026-01', count: 2 },
        { month: '2026-02', count: 1 },
        { month: '2026-02', count: 1 },
      ],
      month('2026-02'),
    )
    expect(series.busiest).toEqual({ index: month('2026-01'), count: 2 })
    expect(series.bins.at(-1)).toEqual({ index: month('2026-02'), count: 2 })
  })

  it('is empty without any (valid) dated completion', () => {
    expect(monthlySeries([], month('2026-01'))).toEqual({
      bins: [],
      max: 0,
      total: 0,
      hiddenBefore: 0,
      busiest: null,
    })
    expect(
      monthlySeries(
        [
          { month: 'nope', count: 3 },
          { month: '2026-01', count: 0 },
        ],
        month('2026-01'),
      ).bins,
    ).toEqual([])
  })
})

describe('niceScale', () => {
  it('rounds the top up to a clean number with a few whole ticks', () => {
    expect(niceScale(0)).toEqual({ top: 1, ticks: [0, 1] })
    expect(niceScale(1)).toEqual({ top: 1, ticks: [0, 1] })
    expect(niceScale(2)).toEqual({ top: 2, ticks: [0, 1, 2] })
    expect(niceScale(4)).toEqual({ top: 4, ticks: [0, 2, 4] })
    expect(niceScale(7)).toEqual({ top: 10, ticks: [0, 5, 10] })
    expect(niceScale(13)).toEqual({ top: 15, ticks: [0, 5, 10, 15] })
    expect(niceScale(140)).toEqual({ top: 150, ticks: [0, 50, 100, 150] })
  })

  it('never uses fractional steps', () => {
    for (let max = 1; max <= 200; max++) {
      const { top, ticks } = niceScale(max)
      expect(top).toBeGreaterThanOrEqual(max)
      expect(ticks.every(Number.isInteger)).toBe(true)
      expect(ticks.length).toBeLessThanOrEqual(5)
    }
  })
})

describe('capLabelIndexes', () => {
  const bins = (counts: number[]) => counts.map((count, index) => ({ index, count }))

  it(`labels every non-zero column up to ${LABEL_EVERY_COLUMN_UP_TO} columns`, () => {
    expect([...capLabelIndexes(bins([1, 0, 2, 3]))]).toEqual([0, 2, 3])
    expect([...capLabelIndexes(bins([1, 1, 1, 1, 1, 1]))]).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('labels only the (first) peak with more columns', () => {
    expect([...capLabelIndexes(bins([1, 1, 3, 1, 1, 1, 1]))]).toEqual([2])
    const many = bins([1, 0, 4, 2, 4, 0, 0, 0, 0, 0, 0, 0, 1])
    expect([...capLabelIndexes(many)]).toEqual([2])
    expect([...capLabelIndexes(bins(Array.from({ length: 20 }, () => 0)))]).toEqual([])
  })
})

describe('hardestPerPlayer', () => {
  it('leaves out players without completions and lists the hardest first', () => {
    const rows = hardestPerPlayer(TEST_PLAYERS)
    expect(rows.map((row) => [row.player.name, row.level.name, row.level.position])).toEqual([
      ['Player Alpha', 'Sample Level 1', 1],
      ['Player Beta', 'Sample Level 1', 1],
    ])
  })

  it('breaks ties by rank (unranked last), then by name', () => {
    const base = TEST_PLAYERS[0] as Player
    const make = (name: string, rank: number | null, position: number): Player => ({
      ...base,
      id: name,
      name,
      rank,
      hardest_level_position: position,
    })
    const rows = hardestPerPlayer([
      make('Zed', null, 2),
      make('Amy', null, 2),
      make('Bob', 3, 2),
      make('Cat', 1, 5),
    ])
    expect(rows.map((row) => row.player.name)).toEqual(['Bob', 'Amy', 'Zed', 'Cat'])
  })
})
