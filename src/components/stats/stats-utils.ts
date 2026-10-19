/**
 * Helpers behind the Stats page charts and lists (and the totals on the home page), kept out of
 * the .tsx files so those only export components. Everything here is pure: the same input
 * always gives the same output, so it is easy to test.
 */
import { DIFFICULTIES, formatNumber, isDemon } from '../../lib/format'
import { parseNumeric } from '../../lib/points'
import type { DifficultyCount, GdDifficulty, MonthCount, Player } from '../../types/models'

const LOCALE = 'en-US'

// ── Numbers ───────────────────────────────────────────────────────────────────────────────────

const compactFormat = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** From this value up, big totals are shortened ("123.5K", "1.2M") so they fit a stat tile. */
export const COMPACT_FROM = 100_000

/**
 * A total for a stat tile: "40,000" below 100,000, then "123.5K" / "1.2M". Use it together
 * with the full formatNumber() value for screen readers and the tooltip.
 */
export function formatCompactNumber(value: number | string | null | undefined): string {
  const number = parseNumeric(value)
  if (number === null) return formatNumber(value)
  return Math.abs(number) >= COMPACT_FROM ? compactFormat.format(number) : formatNumber(number)
}

const percentFormat = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })

/** A share from 0 to 1 as "33%". Tiny but non-zero shares read "<1%" instead of "0%". */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%'
  if (share < 0.005) return '<1%'
  return percentFormat.format(Math.min(share, 1))
}

/** `value / max` as a CSS width or height between 0% and 100% (0% when max is 0). */
export function percentOf(value: number, max: number): string {
  if (!(max > 0) || !(value > 0)) return '0%'
  return `${Math.min(100, (value / max) * 100)}%`
}

// ── Difficulty distribution ───────────────────────────────────────────────────────────────────

export type DifficultyRow = {
  difficulty: GdDifficulty
  count: number
  /** Share of all levels (0–1), for the "33%" label. */
  share: number
  /** Count relative to the biggest row (0–1), for the bar length. */
  ratio: number
}

/**
 * The rows of the "Levels by difficulty" chart, HARDEST first. The five demon difficulties are
 * always listed (a 0 is worth seeing on a demon list); easier ones only when a level has them.
 */
export function difficultyRows(distribution: readonly DifficultyCount[]): DifficultyRow[] {
  const counts = new Map<GdDifficulty, number>()
  for (const row of distribution) {
    if (Number.isFinite(row.count) && row.count > 0) {
      counts.set(row.difficulty, (counts.get(row.difficulty) ?? 0) + row.count)
    }
  }
  let total = 0
  let max = 0
  for (const count of counts.values()) {
    total += count
    max = Math.max(max, count)
  }
  return [...DIFFICULTIES]
    .reverse()
    .filter((difficulty) => isDemon(difficulty) || (counts.get(difficulty) ?? 0) > 0)
    .map((difficulty) => {
      const count = counts.get(difficulty) ?? 0
      return {
        difficulty,
        count,
        share: total > 0 ? count / total : 0,
        ratio: max > 0 ? count / max : 0,
      }
    })
}

// ── Months ────────────────────────────────────────────────────────────────────────────────────

/** How many months the "Completions per month" chart shows at most (the table lists them all). */
export const CHART_MONTHS = 24

/** A month as one whole number: year × 12 + (month − 1). Easy to count forwards and back. */
export type MonthIndex = number

const MONTH_KEY = /^(\d{4})-(\d{2})$/

/** 'YYYY-MM' → its MonthIndex, or null when it isn't a real month. */
export function monthIndexOf(key: string): MonthIndex | null {
  const match = MONTH_KEY.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return year * 12 + month - 1
}

/** The viewer's current month (in their own time zone). */
export function currentMonthIndex(now: Date = new Date()): MonthIndex {
  return now.getFullYear() * 12 + now.getMonth()
}

/** The calendar parts of a MonthIndex. */
export function monthParts(index: MonthIndex): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** The first day of that month at midnight UTC (also for years below 100, unlike Date.UTC). */
function monthDate(index: MonthIndex): Date {
  const { year, month } = monthParts(index)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, 1)
  return date
}

const shortMonthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })
const longMonthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const mediumMonthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "Mar" */
export function shortMonthLabel(index: MonthIndex): string {
  return shortMonthFormat.format(monthDate(index))
}

/** "March 2026" */
export function longMonthLabel(index: MonthIndex): string {
  return longMonthFormat.format(monthDate(index))
}

/** "Mar 2026" */
export function mediumMonthLabel(index: MonthIndex): string {
  return mediumMonthFormat.format(monthDate(index))
}

export type MonthBin = { index: MonthIndex; count: number }

export type MonthlySeries = {
  /** The months the chart draws, oldest first, months without completions included as 0. */
  bins: MonthBin[]
  /** Biggest count among `bins`. */
  max: number
  /** Dated completions in every month (also the ones before the chart's window). */
  total: number
  /** Dated completions in months older than the chart's window (they're in the table). */
  hiddenBefore: number
  /** The month with the most completions overall (the earliest one on a tie), or null. */
  busiest: MonthBin | null
}

/**
 * The months the chart shows: from the first completion up to now (or up to the last
 * completion, if one is dated in the future), at most `maxMonths` of them (the most recent).
 * Months the API sends twice are added together; unreadable month keys are skipped.
 */
export function monthlySeries(
  months: readonly MonthCount[],
  currentMonth: MonthIndex,
  maxMonths: number = CHART_MONTHS,
): MonthlySeries {
  const counts = new Map<MonthIndex, number>()
  for (const { month, count } of months) {
    const index = monthIndexOf(month)
    if (index === null || !Number.isFinite(count) || count <= 0) continue
    counts.set(index, (counts.get(index) ?? 0) + count)
  }
  if (counts.size === 0) return { bins: [], max: 0, total: 0, hiddenBefore: 0, busiest: null }

  const present = [...counts.keys()].sort((a, b) => a - b)
  const first = present[0] ?? currentMonth
  const last = present[present.length - 1] ?? currentMonth
  const end = Math.max(currentMonth, last)
  const start = Math.max(first, end - Math.max(1, Math.floor(maxMonths)) + 1)

  const bins: MonthBin[] = []
  for (let index = start; index <= end; index++) {
    bins.push({ index, count: counts.get(index) ?? 0 })
  }

  let total = 0
  let hiddenBefore = 0
  let busiest: MonthBin | null = null
  for (const index of present) {
    const count = counts.get(index) ?? 0
    total += count
    if (index < start) hiddenBefore += count
    if (!busiest || count > busiest.count) busiest = { index, count }
  }

  return {
    bins,
    max: bins.reduce((max, bin) => Math.max(max, bin.count), 0),
    total,
    hiddenBefore,
    busiest,
  }
}

/**
 * The text under one column of the month chart, or null for no label. Up to 12 columns every
 * month is labelled; with more, only the quarter months (Jan, Apr, Jul, Oct). January shows
 * its year instead ("2026"), so the axis also tells the years apart.
 */
export function monthAxisLabel(index: MonthIndex, binCount: number): string | null {
  const { year, month } = monthParts(index)
  if (binCount > 12 && (month - 1) % 3 !== 0) return null
  return month === 1 ? String(year) : shortMonthLabel(index)
}

/**
 * A y-axis for whole-number counts: the top of the scale (a round number ≥ max) and the tick
 * values from 0 up to it, at most about 4 of them. max 0 → { top: 1, ticks: [0, 1] }.
 */
export function niceScale(max: number): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] }
  const rough = max / 3
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const residual = rough / magnitude
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  const step = Math.max(1, nice * magnitude)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let tick = 0; tick <= top; tick += step) ticks.push(tick)
  return { top, ticks }
}

/** Up to this many columns, every non-zero column has its value printed on the cap. */
export const LABEL_EVERY_COLUMN_UP_TO = 6

/**
 * Which columns get their value printed on the cap. A few columns: every non-zero one. More:
 * only the peak (the first one on a tie), so the chart doesn't turn into a wall of numbers; the
 * y-axis, the hover readout and the table carry the rest.
 */
export function capLabelIndexes(bins: readonly MonthBin[]): Set<MonthIndex> {
  const nonZero = bins.filter((bin) => bin.count > 0)
  if (bins.length <= LABEL_EVERY_COLUMN_UP_TO) return new Set(nonZero.map((bin) => bin.index))
  const peak = nonZero.reduce<MonthBin | null>(
    (best, bin) => (!best || bin.count > best.count ? bin : best),
    null,
  )
  return new Set(peak ? [peak.index] : [])
}

// ── Hardest level per player ──────────────────────────────────────────────────────────────────

export type PlayerHardest = {
  player: Player
  level: { id: string | null; name: string; slug: string; position: number }
}

/**
 * Every player who has beaten something, with the highest-placed level they've beaten.
 * Hardest first (lowest position), then by rank, then by name.
 */
export function hardestPerPlayer(players: readonly Player[]): PlayerHardest[] {
  const rows: PlayerHardest[] = []
  for (const player of players) {
    const { hardest_level_name: name, hardest_level_slug: slug } = player
    const position = player.hardest_level_position
    if (name === null || slug === null || position === null) continue
    rows.push({ player, level: { id: player.hardest_level_id, name, slug, position } })
  }
  return rows.sort(
    (a, b) =>
      a.level.position - b.level.position ||
      (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity) ||
      a.player.name.localeCompare(b.player.name),
  )
}
