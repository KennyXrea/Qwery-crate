import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import {
  LEVEL_CARD_ARROW,
  LEVEL_CARD_GRID,
  LEVEL_CARD_STATS,
  LEVEL_CARD_THUMB,
  LEVEL_CARD_TITLE,
} from './level-visuals'

type LevelCardSkeletonProps = {
  /** Match the real cards' element (default 'li', inside the same kind of list). */
  as?: 'li' | 'div' | 'article'
  className?: string
}

/**
 * A loading placeholder with exactly LevelCard's shape. Hidden from screen readers: mark the
 * list that holds it with aria-busy instead.
 */
export function LevelCardSkeleton({ as = 'li', className }: LevelCardSkeletonProps) {
  return (
    <Card as={as} padding="none" aria-hidden="true" className={cn('p-3 sm:p-4', className)}>
      <div className={LEVEL_CARD_GRID}>
        <Skeleton rounded="xl" className={cn(LEVEL_CARD_THUMB, 'aspect-video')} />
        <div className={cn(LEVEL_CARD_TITLE, 'space-y-2.5')}>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-9 shrink-0" />
            <Skeleton className="h-5 w-3/4 max-w-56" />
          </div>
          <Skeleton className="h-3.5 w-1/2 max-w-32" />
        </div>
        <div className={cn(LEVEL_CARD_STATS, 'flex flex-wrap items-center gap-x-4 gap-y-2')}>
          <Skeleton rounded="full" className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton rounded="full" className={cn(LEVEL_CARD_ARROW, 'size-5')} />
      </div>
    </Card>
  )
}
