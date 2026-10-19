import { useRecentChanges } from '../../hooks/useRecentChanges'
import { recentPath } from '../../lib/paths'
import { SidebarSection } from '../layout/Sidebar'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { RecentChangeItem } from './RecentChangeItem'
import { RecentChangeItemSkeleton } from './RecentChangeItemSkeleton'
import { BOX_LIST, BOX_ROW } from './shared-visuals'
import { ViewAllLink } from './ViewAllLink'

type RecentChangesBoxProps = {
  /** How many changes to show. Default 5. */
  limit?: number
  title?: string
}

/**
 * "Latest changes": the newest few entries of the Recent changes feed (completions, new levels,
 * moves) with a link to /recent. For the home page and the list sidebar. Shows its own
 * skeleton, error (with Try again) and empty states.
 */
export function RecentChangesBox({ limit = 5, title = 'Latest changes' }: RecentChangesBoxProps) {
  const { data, isPending, error, refetch, isFetching } = useRecentChanges({ pageSize: limit })
  const changes = data?.rows ?? []

  return (
    <SidebarSection title={title} action={<ViewAllLink to={recentPath()} label="recent changes" />}>
      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <ol className={BOX_LIST}>
            {Array.from({ length: limit }, (_, i) => (
              <RecentChangeItemSkeleton key={i} showDate className={BOX_ROW} />
            ))}
          </ol>
        ) : changes.length > 0 ? (
          <ol className={BOX_LIST}>
            {changes.map((change) => (
              <RecentChangeItem
                key={`${change.kind}:${change.id}`}
                change={change}
                showDate
                className={BOX_ROW}
              />
            ))}
          </ol>
        ) : error ? (
          <ErrorState
            size="sm"
            titleAs="p"
            title="Couldn't load the latest changes"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <EmptyState
            size="sm"
            titleAs="p"
            title="No changes yet"
            description="New completions, new levels and ranking moves will show up here."
          />
        )}
      </div>
    </SidebarSection>
  )
}
