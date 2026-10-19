import { useId } from 'react'
import { cn } from '../../lib/cn'
import { difficultyLabel, formatCount, formatNumber } from '../../lib/format'
import type { DifficultyCount } from '../../types/models'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { DIFFICULTY_SEGMENT_TONES } from './player-page-visuals'

type DifficultyBreakdownProps = {
  /** Completions per difficulty, in the order to show (see difficultyBreakdown()). */
  counts: DifficultyCount[]
  title?: string
  className?: string
}

/**
 * A small CSS-only bar showing how a player's completions split across difficulties, with a
 * text legend ("Extreme Demon 2"). The bar is decoration for sighted visitors; the legend
 * carries the same numbers for everyone. Renders nothing when there are no completions.
 */
export function DifficultyBreakdown({
  counts,
  title = 'Difficulty breakdown',
  className,
}: DifficultyBreakdownProps) {
  const headingId = useId()
  const shown = counts.filter((entry) => entry.count > 0)
  const total = shown.reduce((sum, entry) => sum + entry.count, 0)
  if (total === 0) return null

  return (
    <Card as="section" padding="md" aria-labelledby={headingId} className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-lg font-semibold text-text">
          {title}
        </h2>
        <p className="text-sm text-muted">{formatCount(total, 'completion')}</p>
      </div>

      <div
        aria-hidden="true"
        data-testid="difficulty-bar"
        className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2"
      >
        {shown.map((entry) => (
          <div
            key={entry.difficulty}
            title={`${difficultyLabel(entry.difficulty)}: ${formatNumber(entry.count)}`}
            data-difficulty={entry.difficulty}
            className={cn('h-full min-w-1.5 basis-0', DIFFICULTY_SEGMENT_TONES[entry.difficulty])}
            style={{ flexGrow: entry.count }}
          />
        ))}
      </div>

      <ul
        aria-label="Completions by difficulty"
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"
      >
        {shown.map((entry) => (
          <li key={entry.difficulty} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'size-2.5 shrink-0 rounded-sm',
                DIFFICULTY_SEGMENT_TONES[entry.difficulty],
              )}
            />
            <span className="text-text">{difficultyLabel(entry.difficulty)}</span>
            <span className="font-mono text-muted tabular-nums">{formatNumber(entry.count)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** A DifficultyBreakdown-shaped loading placeholder (hidden from screen readers). */
export function DifficultyBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <Card aria-hidden="true" padding="md" className={className}>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton rounded="full" className="mt-4 h-3 w-full" />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  )
}
