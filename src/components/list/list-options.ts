/**
 * Labels and choices for the list page's controls, plus small text helpers
 * (kept out of the .tsx files so those only export components).
 */
import { DIFFICULTIES, difficultyLabel, isDifficulty, type GdDifficulty } from '../../lib/format'
import type { LevelSection } from '../../lib/points'
import type { Player } from '../../types/models'
import type { SelectOption } from '../ui/Select'
import type { ListView } from './list-params'
import { isListSort, LEVEL_SORT_LABELS, LIST_SORTS, type LevelSort } from './list-sorts'

// ── Sort, difficulty and view ─────────────────────────────────────────────────────────────────

/** The sort select's choices, with friendly names (?sort=…). */
export const SORT_OPTIONS: SelectOption[] = LIST_SORTS.map((sort) => ({
  value: sort,
  label: LEVEL_SORT_LABELS[sort],
}))

/** Every difficulty, hardest first (that's how the list itself is ordered). */
export const DIFFICULTY_OPTIONS: SelectOption[] = [...DIFFICULTIES]
  .reverse()
  .map((difficulty) => ({ value: difficulty, label: difficultyLabel(difficulty) }))

/** A sort select's value → the sort (anything unknown → list position). */
export function sortFromValue(value: string): LevelSort {
  return isListSort(value) ? value : 'position'
}

/** A difficulty select's value → the difficulty, or null for "Any difficulty". */
export function difficultyFromValue(value: string): GdDifficulty | null {
  return isDifficulty(value) ? value : null
}

export const VIEW_LABELS: Readonly<Record<ListView, string>> = {
  cards: 'Cards',
  table: 'Table',
}

// ── Player filter ─────────────────────────────────────────────────────────────────────────────

type PlayerOptionSource = Pick<Player, 'name' | 'slug' | 'rank'>

/**
 * The "Beaten by" choices: every player with at least one completion (the others have beaten
 * nothing, so they'd only ever give an empty list), A–Z. The player in the URL is always a
 * choice, even before the list has loaded or when they aren't on it, so the select can show
 * them: named after `selected` when that is known, otherwise after the slug itself.
 */
export function playerFilterOptions(
  players: readonly PlayerOptionSource[],
  selectedSlug: string | null,
  selected: Pick<Player, 'name' | 'slug'> | null = null,
): SelectOption[] {
  const options = players
    .filter((player) => player.rank !== null || player.slug === selectedSlug)
    .map((player) => ({ value: player.slug, label: player.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))

  if (selectedSlug !== null && !options.some((option) => option.value === selectedSlug)) {
    const label = selected?.slug === selectedSlug ? selected.name : selectedSlug
    options.unshift({ value: selectedSlug, label })
  }
  return options
}

// ── Section ranges ────────────────────────────────────────────────────────────────────────────

export type PositionRange = { start: number; end: number | null }

/** "#1–25", "#51+" or "#7" (a section of one). */
export function rangeLabel(range: PositionRange): string {
  if (range.end === null) return `#${range.start}+`
  if (range.end === range.start) return `#${range.start}`
  return `#${range.start}–${range.end}`
}

/** The same for screen readers: "positions 1 to 25", "position 51 and below", "position 7". */
export function rangeSpoken(range: PositionRange): string {
  if (range.end === null) return `position ${range.start} and below`
  if (range.end === range.start) return `position ${range.start}`
  return `positions ${range.start} to ${range.end}`
}

/** Short blurbs for each section (sidebar and empty states). */
export const SECTION_BLURBS: Readonly<Record<LevelSection, string>> = {
  main: 'the hardest levels, worth the most points',
  extended: 'still worth points, fewer of them',
  legacy: 'kept for history, worth no points',
}

// ── Results ───────────────────────────────────────────────────────────────────────────────────

/** How many pages `total` rows fill (at least 1). */
export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 1
  return Math.ceil(total / pageSize)
}

/** Which rows a page shows, 1-based and inclusive: page 2 of 61 → { from: 26, to: 50 }. */
export function shownRange(
  page: number,
  pageSize: number,
  rowCount: number,
): { from: number; to: number } {
  const from = (page - 1) * pageSize + 1
  return { from, to: from + Math.max(rowCount, 1) - 1 }
}
