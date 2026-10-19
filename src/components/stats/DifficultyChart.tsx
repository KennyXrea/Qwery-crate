import { useMemo } from 'react'
import { formatCount, formatNumber } from '../../lib/format'
import type { DifficultyCount } from '../../types/models'
import { DifficultyBadge } from '../level/DifficultyBadge'
import { Skeleton } from '../ui/Skeleton'
import { difficultyRows, formatShare, percentOf } from './stats-utils'

type DifficultyChartProps = {
  /** SiteStats.difficultyDistribution (all difficulties, any order). */
  distribution: readonly DifficultyCount[]
}

/**
 * "Levels by difficulty": one horizontal bar per difficulty, hardest first. Every bar has its
 * difficulty name, count and share written next to it, so nothing depends on colour or on
 * hovering, and screen readers hear one sentence per row ("Extreme Demon: 2 levels, 33% of the
 * list"). Bars are measured against the biggest row. Demons are always listed, easier
 * difficulties only when a level has them.
 */
export function DifficultyChart({ distribution }: DifficultyChartProps) {
  const rows = useMemo(() => difficultyRows(distribution), [distribution])

  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li
          key={row.difficulty}
          className="group -mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/60"
        >
          <div className="flex items-center justify-between gap-3">
            <DifficultyBadge difficulty={row.difficulty} />
            <span className="shrink-0 font-mono text-sm text-text tabular-nums">
              <span aria-hidden="true">
                {formatNumber(row.count)}
                <span className="ml-2 inline-block w-9 text-right text-xs text-muted">
                  {formatShare(row.share)}
                </span>
              </span>
              <span className="sr-only">
                : {formatCount(row.count, 'level')}, {formatShare(row.share)} of the list
              </span>
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2.5 rounded-r-sm bg-surface-2">
            <div
              className="h-full rounded-r-sm bg-accent transition-colors group-hover:bg-accent-soft"
              style={{ width: percentOf(row.ratio, 1) }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A loading placeholder shaped like DifficultyChart (five demon rows). */
export function DifficultyChartSkeleton() {
  const widths = ['w-2/5', 'w-4/5', 'w-full', 'w-3/5', 'w-1/5']
  return (
    <div aria-hidden="true" className="space-y-1">
      {widths.map((width, i) => (
        <div key={i} className="py-1.5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton rounded="full" className="h-6 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton rounded="sm" className={`mt-1.5 h-2.5 ${width}`} />
        </div>
      ))}
    </div>
  )
}
