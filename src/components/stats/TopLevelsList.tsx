import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { formatAverage, formatNumber } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Level } from '../../types/models'
import { ROW_LINK } from '../shared/shared-visuals'
import { EmptyState } from '../ui/EmptyState'
import { IconStar } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import { IconRepeat } from './StatsIcons'
import { percentOf } from './stats-utils'

export type TopLevelsMetric = 'enjoyment' | 'attempts'

type TopLevelsListProps = {
  /** Already sorted best first (SiteStats.mostEnjoyed / mostAttempts). */
  levels: readonly Level[]
  /** 'enjoyment' = average enjoyment out of 10; 'attempts' = average attempts. */
  metric: TopLevelsMetric
}

const ROW = 'group relative flex min-h-12 items-center gap-3 py-2.5 first:pt-0 last:pb-0'

function metricValue(level: Level, metric: TopLevelsMetric): number | null {
  return metric === 'enjoyment' ? level.avg_enjoyment : level.avg_attempts
}

/**
 * A short ranked list of levels by one number: "#1 Sample Level 1 — 8.0 / 10". Each row is one
 * link to the level (its name), with the number written out and a thin bar under the name
 * (out of 10 for enjoyment, against the top entry for attempts).
 */
export function TopLevelsList({ levels, metric }: TopLevelsListProps) {
  const rows = levels.flatMap((level) => {
    const value = metricValue(level, metric)
    return value === null || !Number.isFinite(value) ? [] : [{ level, value }]
  })

  if (rows.length === 0) {
    return metric === 'enjoyment' ? (
      <EmptyState
        size="sm"
        titleAs="h3"
        icon={<IconStar />}
        title="No ratings yet"
        description="Levels show up here once someone rates how much they enjoyed them."
      />
    ) : (
      <EmptyState
        size="sm"
        titleAs="h3"
        icon={<IconRepeat />}
        title="No attempt counts yet"
        description="Levels show up here once a record has its number of attempts."
      />
    )
  }

  const scaleMax = metric === 'enjoyment' ? 10 : Math.max(...rows.map((row) => row.value))

  return (
    <ol className="divide-y divide-border">
      {rows.map(({ level, value }) => (
        <li key={level.id} className={ROW}>
          <span className="w-10 shrink-0 text-right">
            <RankNumber rank={level.position} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={levelPath(level.slug)}
                className={cn(
                  ROW_LINK,
                  'min-w-0 truncate font-semibold text-text transition-colors group-hover:text-accent-soft',
                )}
              >
                {level.name}
              </Link>
              <MetricValue metric={metric} value={value} />
            </div>
            <div aria-hidden="true" className="mt-1.5 h-1.5 rounded-r-sm bg-surface-2">
              <div
                className="h-full rounded-r-sm bg-accent transition-colors group-hover:bg-accent-soft"
                style={{ width: percentOf(value, scaleMax) }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function MetricValue({ metric, value }: { metric: TopLevelsMetric; value: number }) {
  if (metric === 'enjoyment') {
    return (
      <span className="shrink-0 font-mono text-sm text-text tabular-nums">
        {formatAverage(value)}
        <span aria-hidden="true" className="text-xs text-muted">
          /10
        </span>
        <span className="sr-only"> out of 10 average enjoyment</span>
      </span>
    )
  }
  return (
    <span className="shrink-0 font-mono text-sm text-text tabular-nums">
      {formatNumber(Math.round(value))}
      <span aria-hidden="true" className="font-sans text-xs text-muted">
        {' avg'}
      </span>
      <span className="sr-only"> attempts on average</span>
    </span>
  )
}

/** A loading placeholder shaped like TopLevelsList. */
export function TopLevelsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ol aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={ROW}>
          <span className="flex w-10 shrink-0 justify-end">
            <Skeleton className="h-4 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton rounded="sm" className="mt-2 h-1.5 w-3/4" />
          </div>
        </li>
      ))}
    </ol>
  )
}
