import { formatNumber } from '../../lib/format'
import type { SiteStats } from '../../types/models'
import { StatGrid } from '../shared/StatGrid'
import { StatGridSkeleton } from '../shared/StatGridSkeleton'
import type { StatGridColumns } from '../shared/shared-visuals'
import { StatTile } from '../shared/StatTile'
import { IconTrophy, IconUsers } from '../ui/icons'
import { IconLayers, IconRepeat } from './StatsIcons'
import { formatCompactNumber } from './stats-utils'

export type SiteTotalsValues = Pick<SiteStats, 'levels' | 'players' | 'records' | 'totalAttempts'>

type SiteTotalsProps = {
  stats: SiteTotalsValues
  /** Columns on wide screens (phones show 2). Default 4. */
  columns?: StatGridColumns
  /** Extra grid classes, e.g. a different column count at one breakpoint. */
  className?: string
}

/**
 * Labels can wrap in narrow tiles ("Total attempts" on phones), so each tile is a column with
 * the label on top and the number pushed to the bottom: numbers in one row always line up.
 */
const TILE = 'flex flex-col [&>dt]:mb-auto'

/** The site's headline numbers: levels, players, records and total attempts. */
export function SiteTotals({ stats, columns = 4, className }: SiteTotalsProps) {
  return (
    <StatGrid columns={columns} label="Site totals" className={className}>
      <StatTile
        size="lg"
        icon={<IconLayers />}
        label="Levels"
        value={<Total value={stats.levels} />}
        className={TILE}
      />
      <StatTile
        size="lg"
        icon={<IconUsers />}
        label="Players"
        value={<Total value={stats.players} />}
        className={TILE}
      />
      <StatTile
        size="lg"
        icon={<IconTrophy />}
        label="Records"
        value={<Total value={stats.records} />}
        className={TILE}
      />
      <StatTile
        size="lg"
        icon={<IconRepeat />}
        label="Total attempts"
        value={<Total value={stats.totalAttempts} />}
        className={TILE}
      />
    </StatGrid>
  )
}

/** A loading placeholder with SiteTotals' shape (pass the same columns / className). */
export function SiteTotalsSkeleton({
  columns = 4,
  className,
}: Pick<SiteTotalsProps, 'columns' | 'className'>) {
  return <StatGridSkeleton count={4} columns={columns} size="lg" className={className} />
}

/** "40,000", or "1.2M" for big numbers (the exact number is read out and shown on hover). */
function Total({ value }: { value: number }) {
  const full = formatNumber(value)
  const short = formatCompactNumber(value)
  if (short === full) return <>{full}</>
  return (
    <>
      <span aria-hidden="true" title={full}>
        {short}
      </span>
      <span className="sr-only">{full}</span>
    </>
  )
}
