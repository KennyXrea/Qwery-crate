import { Link } from 'react-router'
import { useAdjacentLevels } from '../../hooks/useLevel'
import { cn } from '../../lib/cn'
import { levelPath } from '../../lib/paths'
import type { AdjacentLevel } from '../../types/models'
import { Card } from '../ui/Card'
import { STRETCHED_LINK } from '../ui/card-link'
import { ErrorState } from '../ui/ErrorState'
import { IconChevronLeft, IconChevronRight } from '../ui/icons'
import { Skeleton } from '../ui/Skeleton'

type LevelNavProps = {
  /** The current level's position; its neighbours are position − 1 and position + 1. */
  position: number
  className?: string
}

/**
 * "Previous level / Next level" links by position, at the bottom of a level page. #1 has no
 * previous level and the last level no next one; that side is simply left empty.
 */
export function LevelNav({ position, className }: LevelNavProps) {
  const { data, isPending, error, refetch, isFetching } = useAdjacentLevels(position)

  if (!isPending && data && !data.prev && !data.next) return null

  return (
    <nav
      aria-label="Previous and next levels"
      aria-busy={isPending || undefined}
      className={className}
    >
      {isPending ? (
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
          {position > 1 ? <AdjacentSkeleton direction="previous" /> : null}
          <AdjacentSkeleton direction="next" />
        </div>
      ) : data ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.prev ? (
            <li className="min-w-0">
              <AdjacentLink direction="previous" level={data.prev} />
            </li>
          ) : null}
          {data.next ? (
            <li className="min-w-0 sm:col-start-2">
              <AdjacentLink direction="next" level={data.next} />
            </li>
          ) : null}
        </ul>
      ) : error ? (
        <ErrorState
          size="sm"
          titleAs="p"
          title="Couldn't load the previous and next levels"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : null}
    </nav>
  )
}

type Direction = 'previous' | 'next'

function AdjacentLink({ direction, level }: { direction: Direction; level: AdjacentLevel }) {
  const next = direction === 'next'
  const Chevron = next ? IconChevronRight : IconChevronLeft

  return (
    <Card
      padding="none"
      interactive
      className={cn(
        'group relative flex h-full items-center gap-3 p-4',
        next && 'flex-row-reverse',
      )}
    >
      <Chevron className="size-5 text-muted transition-colors group-hover:text-accent" />
      <Link
        to={levelPath(level.slug)}
        rel={next ? 'next' : 'prev'}
        className={cn(STRETCHED_LINK, 'block min-w-0 flex-1', next && 'text-right')}
      >
        <span className="block font-mono text-[0.6875rem] font-medium tracking-widest text-muted uppercase">
          {next ? 'Next level' : 'Previous level'}
        </span>
        <span className="sr-only">:</span>{' '}
        <span className="mt-1 block truncate font-semibold text-text">
          <span className="font-mono text-muted tabular-nums">#{level.position}</span> {level.name}
        </span>
      </Link>
    </Card>
  )
}

function AdjacentSkeleton({ direction }: { direction: Direction }) {
  const next = direction === 'next'
  return (
    <Card
      padding="none"
      className={cn('flex items-center gap-3 p-4', next && 'flex-row-reverse sm:col-start-2')}
    >
      <Skeleton rounded="full" className="size-5 shrink-0" />
      <div className={cn('flex flex-1 flex-col gap-2', next && 'items-end')}>
        <Skeleton rounded="full" className="h-2.5 w-24" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
    </Card>
  )
}
