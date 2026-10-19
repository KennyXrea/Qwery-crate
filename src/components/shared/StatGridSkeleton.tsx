import { cn } from '../../lib/cn'
import { Skeleton } from '../ui/Skeleton'
import { STAT_GRID_COLUMNS, STAT_TILE } from './shared-visuals'
import type { StatGridColumns, StatTileSize } from './shared-visuals'

type StatGridSkeletonProps = {
  /** How many tiles. Default 4. */
  count?: number
  columns?: StatGridColumns
  size?: StatTileSize
  className?: string
}

/** A StatGrid-shaped loading placeholder (hidden from screen readers). */
export function StatGridSkeleton({
  count = 4,
  columns = 4,
  size = 'md',
  className,
}: StatGridSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('grid gap-3 sm:gap-4', STAT_GRID_COLUMNS[columns], className)}
    >
      {Array.from({ length: Math.max(1, Math.floor(count)) }, (_, i) => (
        <div key={i} className={STAT_TILE}>
          <Skeleton className="h-3 w-2/3 max-w-24" />
          <Skeleton className={cn('mt-2.5 w-1/2', size === 'lg' ? 'h-8 sm:h-9' : 'h-6')} />
        </div>
      ))}
    </div>
  )
}
