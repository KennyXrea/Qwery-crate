/**
 * Helpers behind the leaderboard and player-page components (kept out of the .tsx files so
 * those only export components).
 */
import { DIFFICULTIES } from '../../lib/format'
import type { DifficultyCount, GdDifficulty } from '../../types/models'

// ── Leaderboard search ────────────────────────────────────────────────────────────────────────

/** How long typing in the leaderboard search must pause before the search runs. */
export const PLAYER_SEARCH_DELAY_MS = 300

// ── Sorting a player's completed levels ───────────────────────────────────────────────────────

/**
 * How a player's completed levels are ordered: 'position' = hardest level first (list order),
 * 'date' = most recently beaten first. The same values getPlayerRecords() takes.
 */
export type CompletionSort = 'position' | 'date'

export const COMPLETION_SORTS: readonly CompletionSort[] = ['position', 'date']

export const COMPLETION_SORT_LABELS: Readonly<Record<CompletionSort, string>> = {
  position: 'Position',
  date: 'Date',
}

/** 'date' → 'date'; anything else (missing, unknown, wrong case) → 'position'. */
export function parseCompletionSort(value: string | null | undefined): CompletionSort {
  return value === 'date' ? 'date' : 'position'
}

// ── Difficulty breakdown ──────────────────────────────────────────────────────────────────────

/** Every difficulty, hardest first (the order of the breakdown bar and its legend). */
export const DIFFICULTIES_HARDEST_FIRST: readonly GdDifficulty[] = [...DIFFICULTIES].reverse()

/**
 * How many of these completions are of each difficulty, hardest first, leaving out the
 * difficulties with none. Values the site doesn't know are skipped.
 */
export function difficultyBreakdown(
  completions: ReadonlyArray<{ level_difficulty: GdDifficulty }>,
): DifficultyCount[] {
  const counts = new Map<GdDifficulty, number>()
  for (const { level_difficulty: difficulty } of completions) {
    counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1)
  }
  return DIFFICULTIES_HARDEST_FIRST.flatMap((difficulty) => {
    const count = counts.get(difficulty) ?? 0
    return count > 0 ? [{ difficulty, count }] : []
  })
}

/**
 * Bar segment / legend swatch colour per difficulty (theme tokens only), matching the
 * DifficultyBadge colours: demons are red, stronger toward Extreme; the other difficulties use
 * the badge's calmer colours. The legend always names each one, so colour is never the only cue.
 */
export const DIFFICULTY_SEGMENT_TONES: Readonly<Record<GdDifficulty, string>> = {
  extreme_demon: 'bg-danger',
  insane_demon: 'bg-danger/75',
  hard_demon: 'bg-danger/55',
  medium_demon: 'bg-danger/40',
  easy_demon: 'bg-danger/25',
  insane: 'bg-silver',
  harder: 'bg-bronze',
  hard: 'bg-gold',
  normal: 'bg-accent',
  easy: 'bg-success',
  auto: 'bg-muted',
}

// ── Responsive tables ─────────────────────────────────────────────────────────────────────────

/*
 * The leaderboard and the completed-levels table are real <table>s from `md` up, and stack into
 * one small card per row on phones (no sideways scrolling). Some browsers drop a table's
 * semantics when its CSS display changes, so those elements also get explicit ARIA roles.
 * On phones the column headers are visually hidden (screen readers still use them) and each
 * cell shows its own small label (CELL_LABEL, hidden from screen readers) instead.
 */

/** The box around a table on wider screens (on phones each row is its own card). */
export const TABLE_FRAME =
  'md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-surface md:shadow-lg md:shadow-black/20'

export const TABLE = 'w-full border-collapse text-left text-sm max-md:block'

export const TABLE_HEAD = 'max-md:sr-only'

export const TABLE_HEAD_ROW =
  'border-b border-border bg-surface-2/50 font-mono text-[0.6875rem] tracking-widest text-muted uppercase'

/** A column header cell (first and last get extra room at the table's edges). */
export const TH = 'px-3 py-3 font-medium whitespace-nowrap first:pl-5 last:pr-5'

export const TABLE_BODY = 'max-md:block max-md:space-y-3 md:divide-y md:divide-border'

/** One body row: a card on phones, a plain table row with a hover tint from `md` up. */
export const TABLE_ROW =
  'max-md:grid max-md:gap-x-3 max-md:gap-y-3 max-md:rounded-2xl max-md:border max-md:border-border max-md:bg-surface max-md:p-4 max-md:shadow-lg max-md:shadow-black/20 md:transition-colors md:hover:bg-surface-2/40'

/** A body cell's side padding from `md` up (first and last get extra room at the table's edges). */
export const TD_X = 'md:px-3 md:align-middle md:first:pl-5 md:last:pr-5'

/** A body cell's padding from `md` up. Cells holding a 40px link use TD_X + md:py-2 instead. */
export const TD = `${TD_X} md:py-3`

/** The small label above a value on phones (the column header does this job from `md` up). */
export const CELL_LABEL =
  'mb-1 block font-mono text-[0.6875rem] font-medium tracking-wider text-muted uppercase md:hidden'

/** Numbers in table cells. */
export const NUMBER_VALUE = 'font-mono text-text tabular-nums'

// Leaderboard (PlayersTable / PlayerRow). Phones: rank | player (wide) on the first line, then
// points | completions, then the hardest level, all lined up under the player's name.
export const PLAYER_ROW_GRID = 'max-md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)]'

export const PLAYER_COLUMNS = {
  rank: 'max-md:col-start-1 max-md:row-start-1 max-md:self-center md:w-20',
  player: 'min-w-0 max-md:col-span-2 max-md:col-start-2 max-md:row-start-1',
  points: 'max-md:col-start-2 max-md:row-start-2 md:w-32 md:text-right',
  completions: 'max-md:col-start-3 max-md:row-start-2 md:w-32 md:text-right',
  hardest: 'min-w-0 max-md:col-span-2 max-md:col-start-2 max-md:row-start-3 md:w-[30%]',
} as const

// Completed levels (CompletionsList). Phones: rank | level (wide) on the first line, then
// points | attempts | enjoyment, then date (two columns, so it stays on one line) | video, all
// lined up under the level's name.
export const COMPLETION_ROW_GRID = 'max-md:grid-cols-[2.5rem_repeat(3,minmax(0,1fr))]'

export const COMPLETION_COLUMNS = {
  rank: 'max-md:col-start-1 max-md:row-start-1 max-md:self-start max-md:pt-2 md:w-16',
  level: 'min-w-0 max-md:col-span-3 max-md:col-start-2 max-md:row-start-1',
  points: 'max-md:col-start-2 max-md:row-start-2 md:text-right',
  attempts: 'max-md:col-start-3 max-md:row-start-2 md:text-right',
  enjoyment: 'max-md:col-start-4 max-md:row-start-2 md:text-right',
  date: 'whitespace-nowrap max-md:col-span-2 max-md:col-start-2 max-md:row-start-3',
  video: 'max-md:col-start-4 max-md:row-start-3',
} as const
