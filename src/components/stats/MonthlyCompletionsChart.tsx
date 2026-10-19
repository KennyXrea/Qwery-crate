import { useMemo, useState } from 'react'
import type { PointerEvent } from 'react'
import { cn } from '../../lib/cn'
import { formatCount, formatNumber } from '../../lib/format'
import type { MonthCount } from '../../types/models'
import { EmptyState } from '../ui/EmptyState'
import { IconChevronDown } from '../ui/icons'
import { Skeleton } from '../ui/Skeleton'
import { IconChart } from './StatsIcons'
import {
  CHART_MONTHS,
  capLabelIndexes,
  currentMonthIndex,
  longMonthLabel,
  mediumMonthLabel,
  monthAxisLabel,
  monthIndexOf,
  monthlySeries,
  niceScale,
  percentOf,
} from './stats-utils'
import type { MonthIndex } from './stats-utils'

type MonthlyCompletionsChartProps = {
  /** SiteStats.completionsPerMonth ('YYYY-MM', oldest first). */
  months: readonly MonthCount[]
  /** SiteStats.undatedCompletions (not on the chart; mentioned under it). */
  undated: number
  /** The month the chart runs up to (year × 12 + month − 1). Defaults to the viewer's month. */
  currentMonth?: MonthIndex
}

/** The plot's height, shared by the chart and its skeleton. */
const PLOT_HEIGHT = 'h-44'

/**
 * "Completions per month": one column per month, from the first dated completion up to this
 * month (the most recent 24 months at most), drawn with plain CSS. A summary line says the
 * total and the busiest month in words, the peak's value is printed on its column (every
 * column's, when there are only a few), hovering or tapping a column shows its exact count,
 * and "Show as a table" lists every month, so no value depends on the picture.
 */
export function MonthlyCompletionsChart({
  months,
  undated,
  currentMonth,
}: MonthlyCompletionsChartProps) {
  const [viewerMonth] = useState(currentMonthIndex)
  const endMonth = currentMonth ?? viewerMonth
  const series = useMemo(() => monthlySeries(months, endMonth), [months, endMonth])
  const tableRows = useMemo(
    () =>
      months
        .map((row) => ({ index: monthIndexOf(row.month), count: row.count }))
        .filter((row): row is { index: number; count: number } => row.index !== null)
        .filter((row) => row.count > 0)
        .sort((a, b) => b.index - a.index),
    [months],
  )
  const [active, setActive] = useState<MonthIndex | null>(null)

  const undatedNote =
    undated > 0
      ? `${formatCount(undated, 'completion')} without a date ${undated === 1 ? "isn't" : "aren't"} counted here.`
      : null

  if (series.bins.length === 0 || !series.busiest) {
    return (
      <EmptyState
        size="sm"
        titleAs="h3"
        icon={<IconChart />}
        title="No dated completions yet"
        description={undatedNote ?? 'Completions show up here by the month they were beaten.'}
      />
    )
  }

  const { bins, busiest } = series
  const scale = niceScale(series.max)
  const capLabels = capLabelIndexes(bins)
  const first = bins[0]
  const last = bins[bins.length - 1]
  const activeBin = active === null ? null : bins.find((bin) => bin.index === active)

  const clearOnMouseLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setActive(null)
  }

  return (
    <div>
      <p className="text-sm text-pretty text-muted">
        <span className="font-semibold text-text">{formatCount(series.total, 'completion')}</span>{' '}
        with a date. Busiest month:{' '}
        <span className="font-semibold text-text">{longMonthLabel(busiest.index)}</span> with{' '}
        {formatNumber(busiest.count)}.
      </p>
      {series.hiddenBefore > 0 || undatedNote ? (
        <p className="mt-1 text-xs text-muted">
          {series.hiddenBefore > 0
            ? `The chart shows the last ${CHART_MONTHS} months; ${formatCount(series.hiddenBefore, 'older completion')} ${series.hiddenBefore === 1 ? 'is' : 'are'} in the table. `
            : null}
          {undatedNote}
        </p>
      ) : null}

      <div aria-hidden="true" className="mt-4">
        <div className="mb-5 flex min-h-5 items-baseline justify-between gap-3 text-xs text-muted">
          <span className="truncate">
            {first && last
              ? first.index === last.index
                ? mediumMonthLabel(first.index)
                : `${mediumMonthLabel(first.index)} – ${mediumMonthLabel(last.index)}`
              : null}
          </span>
          {activeBin ? (
            <span className="shrink-0">
              <span className="font-mono font-semibold text-text tabular-nums">
                {formatNumber(activeBin.count)}
              </span>{' '}
              {activeBin.count === 1 ? 'completion' : 'completions'} ·{' '}
              {mediumMonthLabel(activeBin.index)}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <div
            className={cn(
              PLOT_HEIGHT,
              'relative w-7 shrink-0 font-mono text-[0.6875rem] text-muted tabular-nums',
            )}
          >
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2 leading-none"
                style={{ bottom: percentOf(tick, scale.top) }}
              >
                {formatNumber(tick)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className={cn(PLOT_HEIGHT, 'relative')} onPointerLeave={clearOnMouseLeave}>
              {scale.ticks.map((tick) => (
                <div
                  key={tick}
                  className={cn(
                    'absolute inset-x-0 h-px',
                    tick === 0 ? 'bg-border-strong' : 'bg-border',
                  )}
                  style={{ bottom: percentOf(tick, scale.top) }}
                />
              ))}
              <div className="absolute inset-0 flex items-end gap-0.5">
                {bins.map((bin) => (
                  <div
                    key={bin.index}
                    data-month={bin.index}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                    onPointerEnter={() => setActive(bin.index)}
                    onPointerDown={() => setActive(bin.index)}
                  >
                    {bin.count > 0 ? (
                      <div
                        className={cn(
                          'relative w-full max-w-6 rounded-t-sm transition-colors',
                          active === bin.index ? 'bg-accent-soft' : 'bg-accent',
                        )}
                        style={{ height: `max(3px, ${percentOf(bin.count, scale.top)})` }}
                      >
                        {capLabels.has(bin.index) ? (
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 font-mono text-[0.6875rem] leading-none text-text tabular-nums">
                            {formatNumber(bin.count)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex h-4 gap-0.5">
              {bins.map((bin) => {
                const label = monthAxisLabel(bin.index, bins.length)
                return (
                  <div key={bin.index} className="relative min-w-0 flex-1">
                    {label ? (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 font-mono text-[0.625rem] leading-4 whitespace-nowrap text-muted">
                        {label}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <details className="group/table mt-4">
        <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-semibold text-accent transition-colors hover:text-accent-soft [&::-webkit-details-marker]:hidden">
          <IconChevronDown className="size-4 transition-transform group-open/table:rotate-180" />
          Show as a table
        </summary>
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Completions per month, newest first (months with at least one completion)
            </caption>
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Month
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Completions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableRows.map((row) => (
                <tr key={row.index}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-text">
                    {longMonthLabel(row.index)}
                  </th>
                  <td className="px-3 py-2 text-right font-mono text-text tabular-nums">
                    {formatNumber(row.count)}
                  </td>
                </tr>
              ))}
              {undated > 0 ? (
                <tr>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                    No date
                  </th>
                  <td className="px-3 py-2 text-right font-mono text-muted tabular-nums">
                    {formatNumber(undated)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/** A loading placeholder shaped like MonthlyCompletionsChart. */
export function MonthlyCompletionsChartSkeleton() {
  const heights = [
    '20%',
    '45%',
    '30%',
    '70%',
    '55%',
    '35%',
    '85%',
    '40%',
    '60%',
    '25%',
    '50%',
    '65%',
  ]
  return (
    <div aria-hidden="true">
      <Skeleton className="h-4 w-3/4 max-w-72" />
      <div className="mt-4 mb-5 h-5">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex gap-2">
        <div className="w-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className={cn(PLOT_HEIGHT, 'flex items-end gap-0.5 border-b border-border')}>
            {heights.map((height, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div className="w-full max-w-6" style={{ height }}>
                  <Skeleton rounded="sm" className="h-full w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 h-4" />
        </div>
      </div>
    </div>
  )
}
