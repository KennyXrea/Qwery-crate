import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import type { PositionHistoryEntry } from '../../types/models'
import { IconArrowDown, IconArrowUp, IconChevronDown, IconPlus } from '../ui/icons'
import { groupPositionHistory, positionChange, shiftRange } from './level-detail'
import type { PositionDirection } from './level-detail'

type PositionHistoryProps = {
  /** The level's history, newest first (as getLevelHistory returns it). */
  entries: readonly PositionHistoryEntry[]
  className?: string
}

/**
 * The vertical line that links a timeline row to the next one (every row but the last draws
 * it, from just under its icon or dot down to the row's end).
 */
const CONNECTOR =
  'relative before:absolute before:bottom-0 before:left-[0.9375rem] before:w-px before:bg-border last:before:hidden'
const STEP_ROW = `${CONNECTOR} flex items-start gap-3 pb-3 before:top-9`
const SHIFT_ROW = `${CONNECTOR} flex items-start gap-3 pb-2.5 before:top-[1.125rem]`

/**
 * A compact timeline of a level's position, newest first: "Moved #7 → #5 (up 2)", "Added at #7".
 * Shifts caused by another level's change are shown smaller, and two or more in a row are
 * folded into one line that opens to list them.
 */
export function PositionHistory({ entries, className }: PositionHistoryProps) {
  const items = groupPositionHistory(entries)

  return (
    <ol className={cn('space-y-1', className)}>
      {items.map((item) => {
        if (item.kind === 'step') {
          return <StepRow key={item.entry.id} entry={item.entry} />
        }
        const [only] = item.entries
        if (item.entries.length === 1 && only) return <ShiftRow key={only.id} entry={only} />
        return <ShiftGroup key={item.entries[0]?.id} entries={item.entries} />
      })}
    </ol>
  )
}

/** An 'added' or 'moved' step: icon tile, sentence, date. */
function StepRow({ entry }: { entry: PositionHistoryEntry }) {
  const { direction, places } = positionChange(entry.old_position, entry.new_position)
  const added = entry.reason === 'added'

  return (
    <li data-reason={entry.reason} className={STEP_ROW}>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border [&_svg]:size-4',
          added
            ? 'border-accent/30 bg-accent/10 text-accent-soft'
            : direction === 'down'
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-success/30 bg-success/10 text-success',
        )}
      >
        {added ? <IconPlus /> : direction === 'down' ? <IconArrowDown /> : <IconArrowUp />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm leading-6 text-text">
          {added ? (
            entry.new_position === null ? (
              'Added to the list'
            ) : (
              <>
                Added at <Position value={entry.new_position} />
              </>
            )
          ) : (
            <>
              Moved <PositionMove from={entry.old_position} to={entry.new_position} />
              <DirectionBadge direction={direction} places={places} />
            </>
          )}
        </p>
        <When at={entry.changed_at} />
      </div>
    </li>
  )
}

/** One 'shifted' step, shown smaller: "Shifted #5 → #6 by another level's change". */
function ShiftRow({ entry }: { entry: PositionHistoryEntry }) {
  return (
    <li data-reason="shifted" className={SHIFT_ROW}>
      <ShiftDot />
      <div className="min-w-0 flex-1">
        <ShiftSentence from={entry.old_position} to={entry.new_position} />
        <When at={entry.changed_at} />
      </div>
    </li>
  )
}

/** Two or more shifts in a row, folded: "Shifted 3 times by other levels' changes". */
function ShiftGroup({ entries }: { entries: readonly PositionHistoryEntry[] }) {
  const { from, to } = shiftRange(entries)
  const newest = entries[0]
  const oldest = entries.at(-1)

  return (
    <li data-reason="shifted" className={SHIFT_ROW}>
      <ShiftDot />
      <details className="group min-w-0 flex-1">
        {/* Everything shown while folded lives in <summary>: the rest of a closed <details> is hidden. */}
        <summary className="-mt-2.5 flex min-h-10 cursor-pointer list-none flex-col justify-center rounded-lg text-xs text-muted transition-colors hover:text-text [&::-webkit-details-marker]:hidden">
          <span className="leading-5">
            Shifted {entries.length} times by other levels' changes
            {from !== null && to !== null && from !== to ? (
              <>
                {' '}
                (<PositionMove from={from} to={to} small />)
              </>
            ) : null}
            <IconChevronDown className="ml-1 inline-block size-3.5 align-[-0.125rem] transition-transform group-open:rotate-180" />
          </span>
          {newest && oldest ? (
            <span className="group-open:hidden">
              <time dateTime={oldest.changed_at}>{formatDate(oldest.changed_at)}</time>
              {' – '}
              <time dateTime={newest.changed_at}>{formatDate(newest.changed_at)}</time>
            </span>
          ) : null}
        </summary>
        <ol className="mt-1 space-y-1.5 border-l border-border pl-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <ShiftSentence from={entry.old_position} to={entry.new_position} />
              <When at={entry.changed_at} />
            </li>
          ))}
        </ol>
      </details>
    </li>
  )
}

function ShiftSentence({ from, to }: { from: number | null; to: number | null }) {
  const { direction, places } = positionChange(from, to)
  return (
    <p className="text-xs leading-5 text-muted">
      Shifted <PositionMove from={from} to={to} small />
      <DirectionBadge direction={direction} places={places} small />
      <span className="sr-only"> by another level's change</span>
    </p>
  )
}

/** The small dot that marks a shift on the timeline (lined up with the big icon tiles). */
function ShiftDot() {
  return (
    <span aria-hidden="true" className="flex h-5 w-8 shrink-0 items-center justify-center">
      <span className="size-2 rounded-full border border-border-strong bg-surface-2" />
    </span>
  )
}

function Position({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <span
      className={cn('font-mono font-semibold tabular-nums', small ? 'text-text/80' : 'text-text')}
    >
      #{value}
    </span>
  )
}

/** "#7 → #5" (screen readers hear "#7 to #5"). */
function PositionMove({
  from,
  to,
  small = false,
}: {
  from: number | null
  to: number | null
  small?: boolean
}) {
  return (
    <span className="whitespace-nowrap">
      {from === null ? '?' : <Position value={from} small={small} />}{' '}
      <span aria-hidden="true">→</span>
      <span className="sr-only"> to</span>{' '}
      {to === null ? '?' : <Position value={to} small={small} />}
    </span>
  )
}

/** "↑ up 2" in green or "↓ down 2" in red; the words are always there. */
function DirectionBadge({
  direction,
  places,
  small = false,
}: {
  direction: PositionDirection
  places: number
  small?: boolean
}) {
  if (direction === 'none') return null
  return (
    <>
      {' '}
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 align-[0.0625rem] font-semibold whitespace-nowrap',
          small ? 'text-[0.6875rem] leading-4' : 'text-xs leading-5',
          direction === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
        )}
      >
        {direction === 'up' ? (
          <IconArrowUp className="size-3" />
        ) : (
          <IconArrowDown className="size-3" />
        )}
        {direction} {places}
      </span>
    </>
  )
}

function When({ at }: { at: string }) {
  return (
    <p className="text-xs text-muted">
      <time dateTime={at}>{formatDate(at)}</time>
    </p>
  )
}
