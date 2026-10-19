import { useRecentRecords } from '../../hooks/useRecentRecords'
import { recentPath } from '../../lib/paths'
import { SidebarSection } from '../layout/Sidebar'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { IconTrophy } from '../ui/icons'
import { RecentChangeItem } from './RecentChangeItem'
import { RecentChangeItemSkeleton } from './RecentChangeItemSkeleton'
import { BOX_LIST, BOX_ROW } from './shared-visuals'
import { ViewAllLink } from './ViewAllLink'

type LatestRecordsBoxProps = {
  /** How many completions to show. Default 5. */
  limit?: number
  title?: string
}

/**
 * "Latest records": the newest completions ("Player beat Level"), including ones entered
 * without a date, with a link to the Completions filter of /recent. For the home page and the
 * list sidebar. Shows its own skeleton, error (with Try again) and empty states.
 */
export function LatestRecordsBox({ limit = 5, title = 'Latest records' }: LatestRecordsBoxProps) {
  const { data, isPending, error, refetch, isFetching } = useRecentRecords(limit)
  const records = data ?? []

  return (
    <SidebarSection
      title={title}
      action={<ViewAllLink to={recentPath('record')} label="completions" />}
    >
      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <ol className={BOX_LIST}>
            {Array.from({ length: limit }, (_, i) => (
              <RecentChangeItemSkeleton key={i} showDate className={BOX_ROW} />
            ))}
          </ol>
        ) : records.length > 0 ? (
          <ol className={BOX_LIST}>
            {records.map((record) => (
              <RecentChangeItem key={record.id} change={record} showDate className={BOX_ROW} />
            ))}
          </ol>
        ) : error ? (
          <ErrorState
            size="sm"
            titleAs="p"
            title="Couldn't load the latest records"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <EmptyState
            size="sm"
            titleAs="p"
            icon={<IconTrophy />}
            title="No records yet"
            description="Completions show up here as soon as they're added."
          />
        )}
      </div>
    </SidebarSection>
  )
}
