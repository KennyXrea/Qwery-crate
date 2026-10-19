import { cn } from '../../lib/cn'
import { STAT_GRID_COLUMNS, STAT_TILE } from '../shared/shared-visuals'
import { Card } from '../ui/Card'
import { Skeleton, SkeletonText } from '../ui/Skeleton'
import { WIDE_ON_PHONES, firstVictorTileSpan } from './level-detail'
import { RecordsTableSkeleton } from './RecordsTableSkeleton'

/** LevelStatGrid's 9 tiles with their phone spans (see level-detail.ts). */
const STAT_TILE_SPANS = [
  WIDE_ON_PHONES,
  WIDE_ON_PHONES,
  '',
  '',
  '',
  '',
  '',
  '',
  firstVictorTileSpan(true),
]

/**
 * The level page while the level loads, shaped like the real page: back link, rank and
 * section, name, byline and description, the video, the stat grid, records and history.
 * Screen readers hear "Loading the level…" once instead of the shapes.
 */
export function LevelPageSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={cn('space-y-8 sm:space-y-10', className)}>
      <p role="status" className="sr-only">
        Loading the level…
      </p>

      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-16 sm:h-12" />
            <Skeleton rounded="full" className="h-7 w-24" />
          </div>
          <Skeleton className="h-9 w-3/4 max-w-md sm:h-10 lg:h-12" />
          <Skeleton className="h-4 w-2/3 max-w-sm" />
          <SkeletonText lines={2} className="max-w-2xl pt-1" />
        </div>
      </div>

      <Skeleton rounded="xl" className="aspect-video w-full" />

      <div aria-hidden="true" className={cn('grid gap-3 sm:gap-4', STAT_GRID_COLUMNS[3])}>
        {STAT_TILE_SPANS.map((span, i) => (
          <div key={i} className={cn(STAT_TILE, span)}>
            <Skeleton className="h-3 w-2/3 max-w-24" />
            <Skeleton className="mt-2.5 h-6 w-1/2 max-w-32" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-7 w-28" />
        <RecordsTableSkeleton rows={2} />
      </div>

      <Card aria-hidden="true" className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <SkeletonText lines={3} className="max-w-sm" />
      </Card>
    </div>
  )
}
