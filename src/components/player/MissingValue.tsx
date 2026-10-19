import { cn } from '../../lib/cn'
import { EMPTY_VALUE } from '../../lib/format'

type MissingValueProps = {
  /** What screen readers hear instead of the dash, e.g. "Unranked" or "No video". */
  label: string
  className?: string
}

/** A muted "—" for an unknown or missing value, read aloud as `label`. */
export function MissingValue({ label, className }: MissingValueProps) {
  return (
    <span title={label} className={cn('text-muted', className)}>
      <span aria-hidden="true">{EMPTY_VALUE}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
