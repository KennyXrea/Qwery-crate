import { useMemo } from 'react'
import { Link } from 'react-router'
import { formatCount } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Player } from '../../types/models'
import { PlayerLink } from '../player/PlayerLink'
import { EmptyState } from '../ui/EmptyState'
import { IconTrophy } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import { hardestPerPlayer } from './stats-utils'

type HardestPerPlayerListProps = {
  /** One page of the leaderboard (players without completions are left out here). */
  players: readonly Player[]
  /** How many players there are in all; a note appears when `players` is only some of them. */
  total?: number
}

/*
 * One row per player. Phones: player + completions on top, the hardest level underneath.
 * sm and up: three columns (player | hardest level | completions) under a header row.
 */
const COLUMNS = 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_8rem]'
const ROW = `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-1.5 ${COLUMNS}`
const PLAYER_CELL = 'col-start-1 row-start-1 min-w-0'
const LEVEL_CELL =
  'col-span-2 col-start-1 row-start-2 flex min-w-0 items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1'
const COUNT_CELL = 'col-start-2 row-start-1 text-right sm:col-start-3'

/**
 * "Hardest level per player": the highest-placed level each player has beaten, hardest first.
 * The player and the level are both links (40px tall).
 */
export function HardestPerPlayerList({ players, total }: HardestPerPlayerListProps) {
  const rows = useMemo(() => hardestPerPlayer(players), [players])

  if (rows.length === 0) {
    return (
      <EmptyState
        size="sm"
        titleAs="h3"
        icon={<IconTrophy />}
        title="No completions yet"
        description="Each player's hardest level shows up here after their first completion."
      />
    )
  }

  return (
    <div>
      <div
        aria-hidden="true"
        className={`hidden gap-x-4 border-b border-border pb-2 font-mono text-[0.6875rem] font-medium tracking-widest text-muted uppercase sm:grid ${COLUMNS}`}
      >
        <span>Player</span>
        <span>Hardest level</span>
        <span className="text-right">Completions</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ player, level }) => (
          <li key={player.id} className={ROW}>
            <div className={PLAYER_CELL}>
              <PlayerLink player={player} />
            </div>
            <div className={LEVEL_CELL}>
              <span className="shrink-0 text-xs text-muted sm:sr-only">Hardest:</span>
              <RankNumber rank={level.position} size="sm" className="shrink-0" />
              <Link
                to={levelPath(level.slug)}
                className="inline-flex min-h-10 min-w-0 items-center font-semibold text-text transition-colors hover:text-accent-soft"
              >
                <span className="truncate">{level.name}</span>
              </Link>
            </div>
            <p className={`${COUNT_CELL} font-mono text-sm text-muted tabular-nums`}>
              {formatCount(player.completions, 'completion')}
            </p>
          </li>
        ))}
      </ul>
      {total !== undefined && total > players.length ? (
        <p className="mt-3 text-xs text-muted">
          Showing the {players.length} highest-ranked players.
        </p>
      ) : null}
    </div>
  )
}

/** A loading placeholder shaped like HardestPerPlayerList. */
export function HardestPerPlayerListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className={`hidden gap-x-4 border-b border-border pb-2 sm:grid ${COLUMNS}`}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={ROW}>
            <div className={`${PLAYER_CELL} flex min-h-10 items-center gap-2.5`}>
              <Skeleton rounded="full" className="size-8 shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className={`${LEVEL_CELL} min-h-10`}>
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className={`${COUNT_CELL} flex justify-end`}>
              <Skeleton className="h-4 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
