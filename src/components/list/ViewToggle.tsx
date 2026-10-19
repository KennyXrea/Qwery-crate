import { useId } from 'react'
import { cn } from '../../lib/cn'
import { IconCards, IconTable } from './ListIcons'
import { VIEW_LABELS } from './list-options'
import { LIST_VIEWS, type ListView } from './list-params'

type ViewToggleProps = {
  value: ListView
  onChange: (view: ListView) => void
  className?: string
}

const VIEW_ICONS = { cards: IconCards, table: IconTable } as const

/**
 * Cards / Table switch: two toggle buttons (aria-pressed) in a labelled group. On phones they
 * shrink to 40px icon buttons; their names stay for screen readers.
 */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const labelId = useId()

  return (
    <div className={cn('shrink-0', className)}>
      <span id={labelId} className="mb-1.5 block text-sm font-medium text-text max-sm:sr-only">
        View
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex gap-px rounded-xl border border-border-strong bg-surface-2 p-px"
      >
        {LIST_VIEWS.map((view) => {
          const pressed = view === value
          const Icon = VIEW_ICONS[view]
          return (
            <button
              key={view}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                if (!pressed) onChange(view)
              }}
              className={cn(
                'inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 rounded-[0.6875rem] px-2.5 text-sm font-semibold transition-colors sm:px-3',
                pressed
                  ? 'bg-accent-strong text-white'
                  : 'text-muted hover:bg-surface hover:text-text',
              )}
            >
              <Icon className="size-4" />
              <span className="max-sm:sr-only">{VIEW_LABELS[view]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
