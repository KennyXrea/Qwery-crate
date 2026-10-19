import { cn } from '../../lib/cn'
import { Skeleton } from '../ui/Skeleton'
import { RECENT_CHANGE_ROW } from './shared-visuals'

type RecentChangeItemSkeletonProps = {
  /** Also draw the date line (match the real items' `showDate`). */
  showDate?: boolean
  as?: 'li' | 'div'
  className?: string
}

/** A loading placeholder shaped like RecentChangeItem (hidden from screen readers). */
export function RecentChangeItemSkeleton({
  showDate = false,
  as: Element = 'li',
  className,
}: RecentChangeItemSkeletonProps) {
  return (
    <Element aria-hidden="true" className={cn(RECENT_CHANGE_ROW, className)}>
      <Skeleton rounded="lg" className="size-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2 pt-1.5">
        <Skeleton className="h-3.5 w-11/12 max-w-72" />
        {showDate ? <Skeleton className="h-3 w-20" /> : null}
      </div>
    </Element>
  )
}
