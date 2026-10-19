import { useId } from 'react'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'

type LevelNotesProps = {
  /** The level's notes (levels.notes). Line breaks are kept. */
  notes: string
  className?: string
}

/** The "Notes" card of a level page (only shown when the level has notes). */
export function LevelNotes({ notes, className }: LevelNotesProps) {
  const headingId = useId()

  return (
    <Card as="section" aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <h2 id={headingId} className="mb-3 text-lg font-semibold text-text">
        Notes
      </h2>
      <p className="text-sm leading-relaxed whitespace-pre-line wrap-break-word text-muted">
        {notes}
      </p>
    </Card>
  )
}
