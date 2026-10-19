import { useId } from 'react'
import { useLevelHistory } from '../../hooks/useLevel'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { PositionHistory } from './PositionHistory'

type PositionHistorySectionProps = {
  levelId: string
  className?: string
}

/**
 * The "Position history" card of a level page: loads the level's ranking history and shows the
 * compact timeline, or a skeleton, an error with Try again, or a short empty note.
 */
export function PositionHistorySection({ levelId, className }: PositionHistorySectionProps) {
  const headingId = useId()
  const { data, isPending, error, refetch, isFetching } = useLevelHistory(levelId)
  const entries = data ?? []

  return (
    <Card as="section" aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <h2 id={headingId} className="mb-4 text-lg font-semibold text-text">
        Position history
      </h2>
      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <PositionHistorySkeleton />
        ) : entries.length > 0 ? (
          <PositionHistory entries={entries} />
        ) : error ? (
          <ErrorState
            size="sm"
            titleAs="h3"
            title="Couldn't load the position history"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <EmptyState
            size="sm"
            titleAs="h3"
            title="No position changes yet"
            description="Moves up and down the list will be recorded here."
          />
        )}
      </div>
    </Card>
  )
}

/** Three timeline rows: icon tile, a sentence and a date. */
function PositionHistorySkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {['w-36', 'w-44', 'w-28'].map((width) => (
        <div key={width} className="flex items-start gap-3">
          <Skeleton rounded="lg" className="size-8 shrink-0" />
          <div className="flex-1 space-y-2 pt-1.5">
            <Skeleton className={cn('h-4', width)} />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
