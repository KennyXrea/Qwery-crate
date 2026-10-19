/**
 * Helpers for the About page's "How the ranking works" and "How points work" sections. They
 * compute everything from the current settings with src/lib/points.ts, so the page always
 * explains the formula the database is really using.
 */
import { formatNumber } from '../../lib/format'
import { formulaPoints, levelSection, sectionRange } from '../../lib/points'
import type { LevelSection, PointsSettings } from '../../lib/points'

/** One row of the "points per position" example table. */
export type PointsExample = { position: number; section: LevelSection; points: number }

/** The last position that still earns points (the end of Extended, or of Main without one). */
export function lastPointsPosition(settings: PointsSettings): number {
  return Math.max(0, settings.mainListSize) + Math.max(0, settings.extendedListSize)
}

/**
 * The first position where the formula reaches the minimum (from there on every Main /
 * Extended level is worth exactly the minimum), or null when no level that earns points gets
 * that low.
 */
export function minimumFromPosition(settings: PointsSettings): number | null {
  const last = lastPointsPosition(settings)
  for (let position = 1; position <= last; position++) {
    const raw = settings.pointsMax * settings.pointsDecay ** (position - 1)
    if (raw <= settings.pointsMin) return position
  }
  return null
}

/**
 * A handful of positions worth showing in the example table, each with its section and
 * formula points: the top three, a few round numbers, both ends of every section that earns
 * points, the first Legacy spot, and where the minimum starts (if it does). Positions past the
 * first Legacy spot are left out (they are all 0).
 */
export function pointsExamples(settings: PointsSettings): PointsExample[] {
  const mainEnd = Math.max(0, settings.mainListSize)
  const last = lastPointsPosition(settings)
  const floor = minimumFromPosition(settings)
  const candidates = [1, 2, 3, 5, 10, 20, mainEnd, mainEnd + 1, last, last + 1]
  if (floor !== null) candidates.push(floor)

  const positions = [...new Set(candidates)]
    .filter((position) => Number.isInteger(position) && position >= 1 && position <= last + 1)
    .sort((a, b) => a - b)

  return positions.flatMap((position) => {
    const section = levelSection(position, settings)
    const points = formulaPoints(position, settings)
    return section === null || points === null ? [] : [{ position, section, points }]
  })
}

/** "#1–25", "#26", "#51 and below", or null when the section is empty right now. */
export function sectionRangeLabel(section: LevelSection, settings: PointsSettings): string | null {
  const range = sectionRange(section, settings)
  if (!range) return null
  if (range.end === null) return `#${formatNumber(range.start)} and below`
  if (range.end === range.start) return `#${formatNumber(range.start)}`
  return `#${formatNumber(range.start)}–${formatNumber(range.end)}`
}

/** How many spots a section has ("25 spots"), or null for Legacy (no end). */
export function sectionSize(section: LevelSection, settings: PointsSettings): number | null {
  if (section === 'legacy') return null
  return Math.max(0, section === 'main' ? settings.mainListSize : settings.extendedListSize)
}

const decayFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })
const percentFormat = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 })

/** The decay as typed in the settings: 0.95 → "0.95", 0.955 → "0.955". */
export function formatDecay(decay: number): string {
  return decayFormat.format(decay)
}

/** The decay as "each place keeps N%": 0.95 → "95%". */
export function formatDecayPercent(decay: number): string {
  return percentFormat.format(decay)
}
