import { parseNumeric, roundNumeric } from './points'

/**
 * Display formatting for dates, numbers and difficulties. Everything uses the fixed 'en-US'
 * locale (the site is in English, and tests give the same result on every computer).
 * Missing or unreadable values show as an em dash.
 */

export const EMPTY_VALUE = '—'

const LOCALE = 'en-US'

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

// Timestamps as Postgres / PostgREST write them, e.g. 2026-10-07T14:02:00.123456+00:00.
// Also accepted: a space instead of "T", "Z", "+00" / "+0000", or no offset (local time).
const TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/i

// Calendar dates are built at midnight UTC and printed in UTC, so the day never shifts.
const calendarDateFormat = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const pointsFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })

const averageFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export type DateFormatOptions = {
  /** IANA time zone for timestamps, e.g. 'America/New_York'. Defaults to the viewer's own. */
  timeZone?: string
}

/** '2026-01-05' → that calendar day at midnight UTC. Impossible dates (Feb 30) → null. */
function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  // Not Date.UTC: it turns years 0–99 into 1900–1999. Postgres has no year 0.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  // Impossible dates quietly roll over (Feb 30 → Mar 2), so check nothing moved.
  const isSameDay =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return year >= 1 && isSameDay ? date : null
}

/** A date/time formatter in the given time zone; an unknown zone falls back to the viewer's own. */
function zonedFormat(options: Intl.DateTimeFormatOptions, timeZone: string | undefined) {
  try {
    return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone })
  } catch {
    return new Intl.DateTimeFormat(LOCALE, options)
  }
}

/** A timestamp string or Date → a valid Date, or null. */
function parseInstant(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const match = TIMESTAMP.exec(value.trim())
  if (!match) return null
  const [, date = '', time = '', fraction = '', zone = ''] = match
  if (!parseDateOnly(date)) return null
  // Rebuild the strict ISO form every browser parses: "T", at most milliseconds, "+hh:mm".
  const millis = fraction ? `.${fraction.slice(0, 3).padEnd(3, '0')}` : ''
  let offset = zone.toUpperCase()
  if (/^[+-]\d{2}$/.test(offset)) offset += ':00'
  else if (/^[+-]\d{4}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`
  const parsed = new Date(`${date}T${time}${millis}${offset}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * "Jan 5, 2026".
 * A date-only value ('2026-01-05', a Postgres `date` such as date_beaten) is a calendar day with
 * no time zone, so it shows that exact day for every viewer. (new Date('2026-01-05') would mean
 * midnight UTC, which is still Jan 4 in the Americas, so it is never used.)
 * A timestamp or Date shows its day in the viewer's time zone, or options.timeZone.
 */
export function formatDate(
  value: string | Date | null | undefined,
  options: DateFormatOptions = {},
): string {
  if (value == null) return EMPTY_VALUE
  if (typeof value === 'string') {
    const day = parseDateOnly(value.trim())
    if (day) return calendarDateFormat.format(day)
  }
  const instant = parseInstant(value)
  if (!instant) return EMPTY_VALUE
  return zonedFormat({ year: 'numeric', month: 'short', day: 'numeric' }, options.timeZone).format(
    instant,
  )
}

/**
 * "Jan 5, 2026, 3:04 PM" for a timestamp (timestamptz ISO string) or Date, in the viewer's time
 * zone or options.timeZone. A date-only value has no time, so it is shown like formatDate.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  options: DateFormatOptions = {},
): string {
  if (value == null) return EMPTY_VALUE
  if (typeof value === 'string' && parseDateOnly(value.trim())) return formatDate(value)
  const instant = parseInstant(value)
  if (!instant) return EMPTY_VALUE
  return zonedFormat({ dateStyle: 'medium', timeStyle: 'short' }, options.timeZone).format(instant)
}

/** Points with exactly 2 decimals: 250 → "250.00", 1234.5 → "1,234.50". */
export function formatPoints(value: number | string | null | undefined): string {
  const points = parseNumeric(value)
  return points === null ? EMPTY_VALUE : pointsFormat.format(roundNumeric(points, 2))
}

/** Counts and totals with thousands separators: 61234 → "61,234" (up to 2 decimals if any). */
export function formatNumber(value: number | string | null | undefined): string {
  const number = parseNumeric(value)
  return number === null ? EMPTY_VALUE : numberFormat.format(roundNumeric(number, 2))
}

/** Averages such as enjoyment with exactly 1 decimal: 7.25 → "7.3", 8 → "8.0". */
export function formatAverage(value: number | string | null | undefined): string {
  const average = parseNumeric(value)
  return average === null ? EMPTY_VALUE : averageFormat.format(roundNumeric(average, 1))
}

/** A length in seconds: 142 → "2:22", 3723 → "1:02:03". Negative or missing → "—". */
export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return EMPTY_VALUE
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`
}

/**
 * Every gd_difficulty value, ordered EASIEST → HARDEST (the same order as the Postgres enum, so
 * it also matches `order by difficulty`). Reverse it for a hardest-first list.
 */
export const DIFFICULTIES = [
  'auto',
  'easy',
  'normal',
  'hard',
  'harder',
  'insane',
  'easy_demon',
  'medium_demon',
  'hard_demon',
  'insane_demon',
  'extreme_demon',
] as const

export type GdDifficulty = (typeof DIFFICULTIES)[number]

const DIFFICULTY_LABELS: Record<GdDifficulty, string> = {
  auto: 'Auto',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  harder: 'Harder',
  insane: 'Insane',
  easy_demon: 'Easy Demon',
  medium_demon: 'Medium Demon',
  hard_demon: 'Hard Demon',
  insane_demon: 'Insane Demon',
  extreme_demon: 'Extreme Demon',
}

/** True for one of the 11 gd_difficulty values (handy for ?difficulty= in the URL). */
export function isDifficulty(value: unknown): value is GdDifficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
}

/** 'extreme_demon' → "Extreme Demon". Missing → "—". */
export function difficultyLabel(difficulty: GdDifficulty | null | undefined): string {
  if (difficulty == null) return EMPTY_VALUE
  if (isDifficulty(difficulty)) return DIFFICULTY_LABELS[difficulty]
  // A value newer than this file (the database enum grew): 'mythic_demon' → "Mythic Demon".
  const fallback = String(difficulty)
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return fallback || EMPTY_VALUE
}

/** True for the five demon difficulties. */
export function isDemon(difficulty: GdDifficulty | null | undefined): boolean {
  return isDifficulty(difficulty) && difficulty.endsWith('_demon')
}

/**
 * A count with its noun, singular or plural: (1, 'victor') → "1 victor",
 * (12000, 'attempt') → "12,000 attempts", (2, 'entry', 'entries') → "2 entries".
 * Missing or unreadable counts → "—".
 */
export function formatCount(
  count: number | string | null | undefined,
  singular: string,
  plural = `${singular}s`,
): string {
  const value = parseNumeric(count)
  if (value === null) return EMPTY_VALUE
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`
}

/**
 * Up to two initials for an avatar or placeholder: "Player Alpha" → "PA", "zoink" → "Z",
 * "xX_dash-master_Xx" → "XX", "Élan vital" → "ÉV", "  " → "?". Words without any letter or
 * digit (emoji, punctuation) are skipped.
 */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').split(/[\s_\-.]+/u).filter((word) => /[\p{L}\p{N}]/u.test(word))
  if (words.length === 0) return '?'
  const first = (word: string) => Array.from(word.replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? ''
  const letters =
    words.length === 1 ? first(words[0] ?? '') : first(words[0] ?? '') + first(words.at(-1) ?? '')
  return letters.toUpperCase() || '?'
}
