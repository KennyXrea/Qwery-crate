import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { EMPTY_VALUE, formatAverage, formatNumber, formatPoints } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Player } from '../../types/models'
import { StatGrid } from '../shared/StatGrid'
import { STAT_GRID_COLUMNS, STAT_TILE } from '../shared/shared-visuals'
import { StatTile } from '../shared/StatTile'
import { IconStar, IconTrophy } from '../ui/icons'
import { INLINE_LINK } from '../ui/link-styles'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'

/** The player fields the stat grid shows (any `Player` has them). */
export type PlayerStatGridPlayer = Pick<
  Player,
  | 'rank'
  | 'total_points'
  | 'completions'
  | 'first_victories'
  | 'total_attempts'
  | 'avg_enjoyment'
  | 'hardest_level_name'
  | 'hardest_level_slug'
  | 'hardest_level_position'
>

type PlayerStatGridProps = {
  player: PlayerStatGridPlayer
  className?: string
}

/** The hardest-level tile spans two columns, so 7 tiles fill 4 + 4 (or 2 × 4 on phones). */
const WIDE_TILE = 'col-span-2'

/**
 * A player's numbers: rank, total points, completions, first victories, hardest level
 * (linked), total attempts and average enjoyment. Unknown values show "—".
 */
export function PlayerStatGrid({ player, className }: PlayerStatGridProps) {
  const hardestSlug = player.hardest_level_slug
  const hardestName = player.hardest_level_name

  return (
    <StatGrid label="Player stats" columns={4} className={className}>
      <StatTile
        label="Rank"
        icon={<IconTrophy />}
        mono={player.rank !== null}
        value={
          player.rank === null ? (
            <span className="text-muted">Unranked</span>
          ) : (
            <RankNumber rank={player.rank} size="md" />
          )
        }
        hint={player.rank === null ? 'Ranked after a first completion' : undefined}
      />
      <StatTile label="Total points" value={formatPoints(player.total_points)} />
      <StatTile label="Completions" value={formatNumber(player.completions)} />
      <StatTile
        label="First victories"
        icon={<IconStar />}
        value={formatNumber(player.first_victories)}
        hint="First to beat a level"
      />
      <StatTile
        label="Hardest level"
        className={WIDE_TILE}
        mono={false}
        value={
          hardestSlug && hardestName ? (
            <Link to={levelPath(hardestSlug)} className={INLINE_LINK}>
              {hardestName}
            </Link>
          ) : (
            EMPTY_VALUE
          )
        }
        hint={
          player.hardest_level_position === null
            ? undefined
            : `#${player.hardest_level_position} on the list`
        }
      />
      <StatTile label="Total attempts" value={formatNumber(player.total_attempts)} />
      <StatTile
        label="Avg enjoyment"
        // The dash looks the same as in the hardest-level tile (monospace makes it narrower).
        mono={player.avg_enjoyment !== null}
        value={
          player.avg_enjoyment === null ? (
            EMPTY_VALUE
          ) : (
            <>
              {formatAverage(player.avg_enjoyment)}
              <span className="text-sm font-normal text-muted">
                <span aria-hidden="true">/10</span>
                <span className="sr-only"> out of 10</span>
              </span>
            </>
          )
        }
      />
    </StatGrid>
  )
}

/** A PlayerStatGrid-shaped loading placeholder (hidden from screen readers). */
export function PlayerStatGridSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('grid gap-3 sm:gap-4', STAT_GRID_COLUMNS[4], className)}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={cn(STAT_TILE, i === 4 && WIDE_TILE)}>
          <Skeleton className="h-3 w-2/3 max-w-24" />
          <Skeleton className={cn('mt-2.5 h-6', i === 4 ? 'w-2/3 max-w-48' : 'w-1/2')} />
        </div>
      ))}
    </div>
  )
}
