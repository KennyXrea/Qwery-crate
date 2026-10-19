import { useId } from 'react'
import { cn } from '../../lib/cn'
import { COMPLETION_SORT_LABELS, COMPLETION_SORTS } from './player-page-visuals'
import type { CompletionSort } from './player-page-visuals'

type CompletionsSortToggleProps = {
  value: CompletionSort
  onChange: (sort: CompletionSort) => void
  className?: string
}

/**
 * "Sort by  [Position] [Date]": two toggle buttons (aria-pressed) for the completed-levels
 * table. Position = hardest level first, Date = most recently beaten first.
 */
export function CompletionsSortToggle({ value, onChange, className }: CompletionsSortToggleProps) {
  const labelId = useId()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span id={labelId} className="text-sm text-muted">
        Sort by
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex rounded-xl border border-border bg-surface p-1"
      >
        {COMPLETION_SORTS.map((sort) => {
          const active = sort === value
          return (
            <button
              key={sort}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (!active) onChange(sort)
              }}
              className={cn(
                'inline-flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold transition-colors',
                active
                  ? 'bg-accent-strong text-white'
                  : 'text-muted hover:bg-surface-2 hover:text-text',
              )}
            >
              {COMPLETION_SORT_LABELS[sort]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
