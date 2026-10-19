import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

type RecordsTableSkeletonProps = {
  /** How many rows. Default 3. */
  rows?: number
  className?: string
}

/** RecordsTable's columns from md up: player, date, attempts, enjoyment, video, notes. */
const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_2.5rem_minmax(0,1.6fr)] md:items-center md:gap-x-8 md:px-4 md:py-3'

/** Header label placeholders: [width, alignment] like the real column headers. */
const HEADER_CELLS: ReadonlyArray<readonly [string, 'start' | 'center' | 'end']> = [
  ['w-14', 'start'],
  ['w-10', 'start'],
  ['w-16', 'end'],
  ['w-18', 'end'],
  ['w-10', 'center'],
  ['w-12', 'start'],
]

const ALIGN = { start: '', center: 'flex justify-center', end: 'flex justify-end' } as const

/**
 * A loading placeholder shaped like RecordsTable: a header row and rows from md up, small cards
 * on phones. Hidden from screen readers (mark the section aria-busy instead).
 */
export function RecordsTableSkeleton({ rows = 3, className }: RecordsTableSkeletonProps) {
  return (
    <Card padding="none" aria-hidden="true" className={cn('overflow-hidden', className)}>
      <div className={cn('hidden border-b border-border bg-surface-2/50 md:grid', DESKTOP_GRID)}>
        {HEADER_CELLS.map(([width, align], i) => (
          <div key={i} className={cn('py-1', ALIGN[align])}>
            <Skeleton rounded="full" className={cn('h-2.5', width)} />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: Math.max(1, Math.floor(rows)) }, (_, i) => (
          <div key={i} className={cn('grid grid-cols-3 gap-x-3 gap-y-3 p-4', DESKTOP_GRID)}>
            <div className="col-span-3 flex min-h-10 items-center gap-2.5 md:col-span-1">
              <Skeleton rounded="full" className="size-8 shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <ValueSkeleton width="w-20" />
            <ValueSkeleton width="w-14" align="end" />
            <ValueSkeleton width="w-10" align="end" />
            <div className="hidden justify-center md:flex">
              <Skeleton rounded="lg" className="size-8" />
            </div>
            <div className="hidden md:block">
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** A value with its small phone-layout label above it. */
function ValueSkeleton({ width, align = 'start' }: { width: string; align?: 'start' | 'end' }) {
  return (
    <div className={cn('space-y-1.5', align === 'end' && 'md:flex md:justify-end')}>
      <Skeleton rounded="full" className="h-2 w-12 md:hidden" />
      <Skeleton className={cn('h-4', width)} />
    </div>
  )
}
