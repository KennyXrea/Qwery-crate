import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { formatNumber, formatPoints } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Player } from '../../types/models'
import { INLINE_LINK } from '../ui/link-styles'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import { MissingValue } from './MissingValue'
import {
  CELL_LABEL,
  NUMBER_VALUE,
  PLAYER_COLUMNS,
  PLAYER_ROW_GRID,
  TABLE_ROW,
  TD,
  TD_X,
} from './player-page-visuals'
import { PlayerLink } from './PlayerLink'

/** The player fields one leaderboard row shows (any `Player` has them). */
export type PlayerRowPlayer = Pick<
  Player,
  | 'id'
  | 'name'
  | 'slug'
  | 'avatar_path'
  | 'country_code'
  | 'rank'
  | 'total_points'
  | 'completions'
  | 'hardest_level_name'
  | 'hardest_level_slug'
  | 'hardest_level_position'
>

type PlayerRowProps = {
  player: PlayerRowPlayer
  className?: string
}

/**
 * One leaderboard row (a <tr>; put it in PlayersTable): rank, avatar + name + flag, total
 * points, completions and the hardest level they've beaten (linked). Players without a
 * completion have no rank and show "—" (read as "Unranked"). On phones the row becomes a
 * small card.
 */
export function PlayerRow({ player, className }: PlayerRowProps) {
  const ranked = player.rank !== null
  const hardestSlug = player.hardest_level_slug
  const hardestName = player.hardest_level_name

  return (
    <tr
      role="row"
      data-ranked={ranked ? 'true' : 'false'}
      className={cn(TABLE_ROW, PLAYER_ROW_GRID, className)}
    >
      <td role="cell" className={cn(TD, PLAYER_COLUMNS.rank)}>
        {player.rank === null ? (
          <MissingValue label="Unranked" className="font-display text-base font-bold" />
        ) : (
          <RankNumber rank={player.rank} size="sm" />
        )}
      </td>

      <th
        role="rowheader"
        scope="row"
        className={cn(TD_X, PLAYER_COLUMNS.player, 'text-left font-normal md:py-2')}
      >
        <PlayerLink player={player} />
      </th>

      <td role="cell" className={cn(TD, PLAYER_COLUMNS.points)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Points
        </span>
        <span className={cn(NUMBER_VALUE, 'font-semibold', !ranked && 'text-muted')}>
          {formatPoints(player.total_points)}
        </span>
      </td>

      <td role="cell" className={cn(TD, PLAYER_COLUMNS.completions)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Completions
        </span>
        <span className={cn(NUMBER_VALUE, !ranked && 'text-muted')}>
          {formatNumber(player.completions)}
        </span>
      </td>

      <td role="cell" className={cn(TD, PLAYER_COLUMNS.hardest)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Hardest
        </span>
        {hardestSlug && hardestName ? (
          <span className="flex min-w-0 items-baseline gap-2">
            {player.hardest_level_position === null ? null : (
              <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                #{player.hardest_level_position}
              </span>
            )}
            <Link to={levelPath(hardestSlug)} className={cn(INLINE_LINK, 'min-w-0 break-words')}>
              {hardestName}
            </Link>
          </span>
        ) : (
          <MissingValue label="No completions yet" />
        )}
      </td>
    </tr>
  )
}

/** A loading placeholder shaped like PlayerRow (its table is hidden from screen readers). */
export function PlayerRowSkeleton({ className }: { className?: string }) {
  return (
    <tr className={cn(TABLE_ROW, PLAYER_ROW_GRID, className)}>
      <td className={cn(TD, PLAYER_COLUMNS.rank)}>
        <Skeleton className="h-5 w-8" />
      </td>
      <td className={cn(TD_X, PLAYER_COLUMNS.player, 'md:py-2')}>
        <div className="flex min-h-10 items-center gap-2.5">
          <Skeleton rounded="full" className="size-8 shrink-0" />
          <Skeleton className="h-4 w-32 max-w-full" />
        </div>
      </td>
      <td className={cn(TD, PLAYER_COLUMNS.points)}>
        <Skeleton className="mb-1.5 h-3 w-12 md:hidden" />
        <Skeleton className="h-4 w-16 md:ml-auto" />
      </td>
      <td className={cn(TD, PLAYER_COLUMNS.completions)}>
        <Skeleton className="mb-1.5 h-3 w-20 md:hidden" />
        <Skeleton className="h-4 w-6 md:ml-auto" />
      </td>
      <td className={cn(TD, PLAYER_COLUMNS.hardest)}>
        <Skeleton className="mb-1.5 h-3 w-14 md:hidden" />
        <Skeleton className="h-4 w-36 max-w-full" />
      </td>
    </tr>
  )
}
