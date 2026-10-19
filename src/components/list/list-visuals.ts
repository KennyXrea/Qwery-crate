/**
 * Class lists for the list page's table view, shared by LevelTable and its skeleton so both
 * have exactly the same shape.
 *
 * The table reacts to the width of its own box (a container query), not the screen: it is a
 * real table once its box is at least 48rem wide, and below that every row becomes a small
 * stacked card (no sideways scrolling):
 *
 *   #1   Sample Level 1         250.00 pts
 *        by Creator Alpha
 *        [Extreme Demon]            ★ 8.0
 *        First victor  Player Alpha  +1
 *
 * Changing a table's `display` makes some browsers forget it is a table, so the elements also
 * carry their table roles explicitly (role="row", role="cell", …).
 */

/** Goes on the box around the table: the width the container queries measure. */
export const LEVEL_TABLE_CONTAINER = '@container'

export const LEVEL_TABLE_FRAME =
  'overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-black/20'

export const LEVEL_TABLE = 'w-full text-sm @max-3xl:block @3xl:table-fixed'

/** The header row is only for screen readers while the rows are stacked. */
export const LEVEL_TABLE_HEAD = 'border-b border-border bg-surface-2/50 @max-3xl:sr-only'

export const LEVEL_TABLE_HEAD_CELL =
  'px-3 py-3 text-left text-xs font-semibold text-muted first:pl-4 last:pr-4'

export const LEVEL_TABLE_BODY = 'divide-y divide-border @max-3xl:block'

/** One row; `relative` so the level link can stretch over the whole row (TABLE_ROW_LINK). */
export const LEVEL_TABLE_ROW =
  'relative transition-colors hover:bg-surface-2 has-focus-visible:bg-surface-2 @max-3xl:grid @max-3xl:grid-cols-[2.5rem_minmax(0,1fr)_auto] @max-3xl:items-center @max-3xl:gap-x-3 @max-3xl:gap-y-2 @max-3xl:p-4'

export const LEVEL_TABLE_CELL = 'align-middle @3xl:px-3 @3xl:py-3 @3xl:first:pl-4 @3xl:last:pr-4'

/** Per column: the header cell's width in table mode, and the cell's place when stacked. */
export const LEVEL_TABLE_COLUMNS = {
  rank: {
    head: 'w-14',
    cell: '@max-3xl:col-start-1 @max-3xl:row-span-3 @max-3xl:row-start-1 @max-3xl:self-start @max-3xl:pt-0.5',
  },
  level: { head: '', cell: '@max-3xl:col-start-2 @max-3xl:row-start-1' },
  difficulty: { head: 'w-44', cell: '@max-3xl:col-start-2 @max-3xl:row-start-2' },
  player: {
    head: 'w-40',
    cell: '@max-3xl:col-span-2 @max-3xl:col-start-2 @max-3xl:row-start-3',
  },
  points: {
    head: 'w-24 text-right',
    cell: 'text-right @max-3xl:col-start-3 @max-3xl:row-start-1 @max-3xl:self-start',
  },
  enjoyment: {
    head: 'w-24 text-right',
    cell: 'text-right @max-3xl:col-start-3 @max-3xl:row-start-2',
  },
} as const

/** Only shown while the rows are stacked (labels the table header gives otherwise). */
export const STACKED_ONLY = '@3xl:hidden'

/**
 * The level link in a row: its ::after covers the whole row, so a click anywhere on the row
 * opens the level, and the keyboard focus ring is drawn around the row. Other links in the row
 * (the first victor) sit above it with `relative z-10`.
 */
export const TABLE_ROW_LINK =
  'after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent'

/** How many skeleton rows / cards stand in for the levels while they load. */
export const SKELETON_TABLE_ROWS = 8
export const SKELETON_CARDS = 5
