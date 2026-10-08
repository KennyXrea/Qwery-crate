/**
 * The list sections and points formula, copied from the database
 * (supabase/migrations/20261007140200_functions_views.sql: level_section(), level_points() and
 * the points columns of records_view / levels_view). Pages show the points the database
 * computed; this copy is only for previews in the admin dashboard (a level's points before it is
 * saved, the settings preview table). Change the SQL and this file together.
 */

export const LEVEL_SECTIONS = ['main', 'extended', 'legacy'] as const

export type LevelSection = (typeof LEVEL_SECTIONS)[number]

/** The site_settings values the formula uses (camelCase version of the row). */
export type PointsSettings = {
  mainListSize: number
  extendedListSize: number
  pointsMax: number
  pointsDecay: number
  pointsMin: number
}

/** The database defaults: #1–25 Main, #26–50 Extended, 250 points for #1, ×0.95 per place, floor 5. */
export const DEFAULT_POINTS_SETTINGS: Readonly<PointsSettings> = Object.freeze({
  mainListSize: 25,
  extendedListSize: 25,
  pointsMax: 250,
  pointsDecay: 0.95,
  pointsMin: 5,
})

/**
 * The matching site_settings columns. Postgres `numeric` can reach the browser as a number or
 * as a string, so both are accepted.
 */
export type PointsSettingsRow = {
  main_list_size?: number | string | null
  extended_list_size?: number | string | null
  points_max?: number | string | null
  points_decay?: number | string | null
  points_min?: number | string | null
}

export function isLevelSection(value: unknown): value is LevelSection {
  return typeof value === 'string' && (LEVEL_SECTIONS as readonly string[]).includes(value)
}

// A plain decimal such as '12', '-0.5', '.5' or '1e3'. Number() alone would also read
// JavaScript-only forms like '0x10' (16), '0b11' and '0o7'.
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

/** Reads a Postgres numeric sent as a number or a string. Anything else → null. */
export function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && DECIMAL.test(value.trim())) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Builds the settings from a site_settings row. Like the SQL (coalesce(…, default)), a missing
 * row or a missing / unreadable column falls back to the default value.
 */
export function pointsSettingsFromRow(row: PointsSettingsRow | null | undefined): PointsSettings {
  const d = DEFAULT_POINTS_SETTINGS
  return {
    mainListSize: parseNumeric(row?.main_list_size) ?? d.mainListSize,
    extendedListSize: parseNumeric(row?.extended_list_size) ?? d.extendedListSize,
    pointsMax: parseNumeric(row?.points_max) ?? d.pointsMax,
    pointsDecay: parseNumeric(row?.points_decay) ?? d.pointsDecay,
    pointsMin: parseNumeric(row?.points_min) ?? d.pointsMin,
  }
}

/**
 * Rounds like Postgres round(numeric, decimals): an exact half goes away from zero.
 * Plain Math.round(x * 100) / 100 is not enough because floats can't hold most decimals
 * exactly: 200 × 0.95³ is exactly 171.475 (Postgres gives 171.48), but in JavaScript it comes out
 * as 171.47499999999997 and would round down. Cutting the scaled value to 12 significant digits
 * first removes that tiny error (floats carry about 16) and leaves the real digits alone.
 */
export function roundNumeric(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** decimals
  const scaled = Math.abs(value) * factor
  // From 2^52 up a float has no digits after the point left to round, and dividing by the factor
  // again (or overflowing to Infinity) would change it: 1e21 → 999999999999999900000.
  if (!(scaled < 2 ** 52)) return value
  // Below 10^9, 12 digits still keep 3+ digits after the point; bigger numbers are left as they are.
  const cleaned = scaled < 1e9 ? Number(scaled.toPrecision(12)) : scaled
  const rounded = Math.round(cleaned) / factor
  // Never return -0 (it would print as "-0.00").
  return value < 0 && rounded !== 0 ? -rounded : rounded
}

/** Positions are whole numbers from 1 up; anything else is not a place on the list. */
function isValidPosition(position: number | null | undefined): position is number {
  return typeof position === 'number' && Number.isInteger(position) && position >= 1
}

/** Which section a position falls in. Invalid positions (null, 0, negative, 1.5, NaN) → null. */
export function levelSection(
  position: number | null | undefined,
  settings: PointsSettings,
): LevelSection | null {
  if (!isValidPosition(position)) return null
  if (position <= settings.mainListSize) return 'main'
  if (position <= settings.mainListSize + settings.extendedListSize) return 'extended'
  return 'legacy'
}

/**
 * The formula's points for a position (what SQL level_points() returns):
 * legacy → 0, otherwise max(pointsMin, pointsMax × pointsDecay^(position − 1)) rounded to 2
 * decimals. Invalid positions → null.
 */
export function formulaPoints(
  position: number | null | undefined,
  settings: PointsSettings,
): number | null {
  if (!isValidPosition(position)) return null
  if (levelSection(position, settings) === 'legacy') return 0
  const raw = settings.pointsMax * settings.pointsDecay ** (position - 1)
  return roundNumeric(Math.max(settings.pointsMin, raw), 2)
}

/**
 * A level's actual points (the views' `points` / `level_points` column): legacy levels are always
 * worth 0, even with an override; otherwise the override wins over the formula. Like the SQL,
 * the override is used as it is (not rounded). Invalid positions → null.
 */
export function levelPoints(
  position: number | null | undefined,
  pointsOverride: number | null | undefined,
  settings: PointsSettings,
): number | null {
  const section = levelSection(position, settings)
  if (section === null) return null
  if (section === 'legacy') return 0
  if (typeof pointsOverride === 'number' && Number.isFinite(pointsOverride)) return pointsOverride
  return formulaPoints(position, settings)
}

/**
 * The positions a section covers, e.g. Main = { start: 1, end: 25 }. Legacy has no end (null).
 * Returns null when the section is empty (an Extended size of 0).
 */
export function sectionRange(
  section: LevelSection,
  settings: PointsSettings,
): { start: number; end: number | null } | null {
  const mainEnd = settings.mainListSize
  const extendedEnd = settings.mainListSize + settings.extendedListSize
  switch (section) {
    case 'main':
      return mainEnd >= 1 ? { start: 1, end: mainEnd } : null
    case 'extended':
      return extendedEnd > mainEnd ? { start: mainEnd + 1, end: extendedEnd } : null
    case 'legacy':
      return { start: extendedEnd + 1, end: null }
  }
}
