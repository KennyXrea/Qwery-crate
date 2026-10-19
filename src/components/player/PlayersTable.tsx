import { cn } from '../../lib/cn'
import {
  PLAYER_COLUMNS,
  TABLE,
  TABLE_BODY,
  TABLE_FRAME,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TH,
} from './player-page-visuals'
import { PlayerRow, PlayerRowSkeleton } from './PlayerRow'
import type { PlayerRowPlayer } from './PlayerRow'

type PlayersTableProps = {
  /** One page of the leaderboard, best rank first. */
  players: PlayerRowPlayer[]
  /** Read by screen readers as the table's name. */
  caption?: string
  className?: string
}

function PlayersTableHead() {
  return (
    <thead role="rowgroup" className={TABLE_HEAD}>
      <tr role="row" className={TABLE_HEAD_ROW}>
        <th role="columnheader" scope="col" className={cn(TH, PLAYER_COLUMNS.rank)}>
          Rank
        </th>
        <th role="columnheader" scope="col" className={cn(TH, PLAYER_COLUMNS.player)}>
          Player
        </th>
        <th role="columnheader" scope="col" className={cn(TH, PLAYER_COLUMNS.points)}>
          Points
        </th>
        <th role="columnheader" scope="col" className={cn(TH, PLAYER_COLUMNS.completions)}>
          Completions
        </th>
        <th role="columnheader" scope="col" className={cn(TH, PLAYER_COLUMNS.hardest)}>
          Hardest
        </th>
      </tr>
    </thead>
  )
}

/**
 * The players leaderboard: Rank | Player | Points | Completions | Hardest. A real table from
 * `md` up; on phones every player becomes a small stacked card (no sideways scrolling).
 */
export function PlayersTable({
  players,
  caption = 'Players ranked by total points',
  className,
}: PlayersTableProps) {
  return (
    <div className={cn(TABLE_FRAME, className)}>
      <table role="table" className={TABLE}>
        <caption className="sr-only">{caption}</caption>
        <PlayersTableHead />
        <tbody role="rowgroup" className={TABLE_BODY}>
          {players.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A PlayersTable-shaped loading placeholder (hidden from screen readers). */
export function PlayersTableSkeleton({
  rows = 8,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div aria-hidden="true" className={cn(TABLE_FRAME, className)}>
      <table className={TABLE}>
        <PlayersTableHead />
        <tbody className={TABLE_BODY}>
          {Array.from({ length: Math.max(1, Math.floor(rows)) }, (_, i) => (
            <PlayerRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
