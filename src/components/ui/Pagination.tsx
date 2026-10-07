import { cn } from '../../lib/cn'
import { Button } from './Button'
import { IconChevronLeft, IconChevronRight } from './icons'
import { clampPage, getPageItems } from './pagination-utils'

type PaginationProps = {
  /** The current page, starting at 1. */
  page: number
  totalPages: number
  /** Called with the new page (always within 1…totalPages and different from `page`). */
  onPageChange: (page: number) => void
  /** Accessible name of the navigation landmark — make it specific if a page has two pagers. */
  label?: string
  className?: string
}

/**
 * Previous / numbered pages / Next. On phones the numbers collapse into "Page X of Y".
 * Renders nothing when there's only one page.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  label = 'Pagination',
  className,
}: PaginationProps) {
  const items = getPageItems(page, totalPages)
  if (items.length <= 1) return null

  const total = Math.floor(totalPages)
  const current = clampPage(page, total)
  const isFirst = current <= 1
  const isLast = current >= total

  function goTo(target: number) {
    const next = clampPage(target, total)
    if (next !== current) onPageChange(next)
  }

  // Prev/Next use aria-disabled (not `disabled`) so keyboard focus stays on the button
  // when you reach the first or last page. Below `sm` they shrink to icon-only squares;
  // their aria-label keeps them named either way.
  return (
    <nav
      aria-label={label}
      className={cn('flex items-center justify-between gap-3 sm:justify-center', className)}
    >
      <Button
        variant="secondary"
        size="sm"
        aria-label="Previous page"
        aria-disabled={isFirst || undefined}
        onClick={() => {
          if (!isFirst) goTo(current - 1)
        }}
        leftIcon={<IconChevronLeft />}
        className="max-sm:w-10 max-sm:px-0"
      >
        <span className="max-sm:hidden">Previous</span>
      </Button>

      <ul className="hidden items-center gap-1 sm:flex">
        {items.map((item) =>
          item === 'ellipsis-start' || item === 'ellipsis-end' ? (
            <li
              key={item}
              aria-hidden="true"
              className="flex size-10 items-center justify-center text-muted select-none"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => goTo(item)}
                aria-label={`Page ${item}`}
                aria-current={item === current ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl px-2 font-mono text-sm tabular-nums transition-colors',
                  item === current
                    ? 'bg-accent-strong font-semibold text-white'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <p aria-live="polite" className="text-sm text-muted sm:hidden">
        Page <span className="font-mono font-semibold text-text">{current}</span> of{' '}
        <span className="font-mono">{total}</span>
      </p>

      <Button
        variant="secondary"
        size="sm"
        aria-label="Next page"
        aria-disabled={isLast || undefined}
        onClick={() => {
          if (!isLast) goTo(current + 1)
        }}
        rightIcon={<IconChevronRight />}
        className="max-sm:w-10 max-sm:px-0"
      >
        <span className="max-sm:hidden">Next</span>
      </Button>
    </nav>
  )
}
