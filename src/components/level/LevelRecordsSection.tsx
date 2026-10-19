import { useId } from 'react'
import { useLevelRecords } from '../../hooks/useLevel'
import { formatCount } from '../../lib/format'
import type { Level } from '../../types/models'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { IconTrophy } from '../ui/icons'
import { RecordsTable } from './RecordsTable'
import { RecordsTableSkeleton } from './RecordsTableSkeleton'

type LevelRecordsSectionProps = {
  level: Pick<Level, 'id' | 'name' | 'victor_count'>
  className?: string
}

/** Most skeleton rows shown while the records load. */
const MAX_SKELETON_ROWS = 5

/**
 * The "Records" section of a level page: loads everyone who beat the level (first victor
 * first) and shows the table, or a skeleton, an error with Try again, or "Nobody has beaten
 * this level yet".
 */
export function LevelRecordsSection({ level, className }: LevelRecordsSectionProps) {
  const headingId = useId()
  const { data, isPending, error, refetch, isFetching } = useLevelRecords(level.id)
  const records = data ?? []

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-xl font-semibold text-text sm:text-2xl">
          Records
        </h2>
        {data ? (
          <p className="text-sm text-muted">{formatCount(records.length, 'victor')}</p>
        ) : null}
      </div>

      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <RecordsTableSkeleton
            rows={Math.min(Math.max(level.victor_count, 1), MAX_SKELETON_ROWS)}
          />
        ) : records.length > 0 ? (
          <RecordsTable records={records} levelName={level.name} />
        ) : error ? (
          <ErrorState
            size="sm"
            titleAs="h3"
            title="Couldn't load the records"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <EmptyState
            size="sm"
            titleAs="h3"
            icon={<IconTrophy />}
            title="Nobody has beaten this level yet"
            description="When someone in the group beats it, their record shows up here."
          />
        )}
      </div>
    </section>
  )
}
