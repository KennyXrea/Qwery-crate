/** Helpers behind the shared components' looks (kept out of the .tsx files). */
import type { RecentChange } from '../../types/models'

// ── Stat grids ────────────────────────────────────────────────────────────────────────────────

export type StatGridColumns = 2 | 3 | 4

/** Two columns on phones, then up to `columns` on wider screens. */
export const STAT_GRID_COLUMNS: Readonly<Record<StatGridColumns, string>> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
}

export type StatTileSize = 'md' | 'lg'

export const STAT_TILE = 'min-w-0 rounded-xl border border-border bg-surface p-4'

export const STAT_VALUE_SIZES: Readonly<Record<StatTileSize, string>> = {
  md: 'text-lg',
  lg: 'text-2xl sm:text-3xl',
}

// ── Recent changes ────────────────────────────────────────────────────────────────────────────

/** Which way a ranking move went: 'up' = to a better (smaller) position. */
export type MoveDirection = 'up' | 'down' | 'none'

/** The direction and size of a level_moved change ("up 3"); other kinds → 'none', 0. */
export function moveOf(change: RecentChange): { direction: MoveDirection; places: number } {
  if (change.kind !== 'level_moved') return { direction: 'none', places: 0 }
  const places = Math.abs(change.old_position - change.new_position)
  if (places === 0) return { direction: 'none', places: 0 }
  return { direction: change.new_position < change.old_position ? 'up' : 'down', places }
}

/** The icon tile colour for each kind of change (moves: green up, red down). */
export function recentChangeTone(change: RecentChange): string {
  if (change.kind === 'record') return 'border-gold/30 bg-gold/10 text-gold'
  if (change.kind === 'level_added') return 'border-accent/30 bg-accent/10 text-accent-soft'
  const { direction } = moveOf(change)
  if (direction === 'up') return 'border-success/30 bg-success/10 text-success'
  if (direction === 'down') return 'border-danger/30 bg-danger/10 text-danger'
  return 'border-border bg-surface-2 text-muted'
}

/** The row layout shared by RecentChangeItem and its skeleton. */
export const RECENT_CHANGE_ROW = 'flex items-start gap-3'
export const RECENT_CHANGE_ICON =
  'flex size-8 shrink-0 items-center justify-center rounded-lg border [&_svg]:size-4'

/** Rows inside the small boxes (home page, list sidebar). */
export const BOX_LIST = 'divide-y divide-border'
export const BOX_ROW = 'py-3 first:pt-0 last:pb-0'

/** One TopPlayersBox row: at least 48px tall, the whole row is the link (see ROW_LINK). */
export const TOP_PLAYER_ROW = 'flex min-h-12 items-center gap-3 py-2 first:pt-0 last:pb-0'

/**
 * For the one link in a list row that should make the whole row clickable (like Card's
 * STRETCHED_LINK, but with a small corner radius and a focus ring just around the row).
 * Give the row `relative`.
 */
export const ROW_LINK =
  'after:absolute after:-inset-x-2 after:inset-y-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-0 focus-visible:after:outline-accent'
