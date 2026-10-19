import { Link } from 'react-router'
import { usePlayers } from '../../hooks/usePlayers'
import { cn } from '../../lib/cn'
import { formatPoints } from '../../lib/format'
import { playerPath } from '../../lib/paths'
import { SidebarSection } from '../layout/Sidebar'
import { CountryFlag } from '../player/CountryFlag'
import { PlayerAvatar } from '../player/PlayerAvatar'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { IconUsers } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import { BOX_LIST, ROW_LINK, TOP_PLAYER_ROW } from './shared-visuals'
import { ViewAllLink } from './ViewAllLink'

type TopPlayersBoxProps = {
  /** How many players to show. Default 5. */
  limit?: number
  title?: string
}

/**
 * "Top players": the leaderboard's first few players (rank, avatar, name + flag, total points
 * under the name) with a link to /players. Each whole row links to the player's page, so it is
 * an easy tap target and the name has the full width of a narrow sidebar. Players without a
 * completion have no rank and are left out. Shows its own skeleton, error (with Try again) and
 * empty states.
 */
export function TopPlayersBox({ limit = 5, title = 'Top players' }: TopPlayersBoxProps) {
  const { data, isPending, error, refetch, isFetching } = usePlayers({ pageSize: limit })
  const players = (data?.rows ?? []).filter((player) => player.rank !== null)

  return (
    <SidebarSection title={title} action={<ViewAllLink to="/players" label="players" />}>
      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <ol aria-hidden="true" className={BOX_LIST}>
            {Array.from({ length: limit }, (_, i) => (
              <li key={i} className={TOP_PLAYER_ROW}>
                <Skeleton className="h-5 w-7 shrink-0" />
                <Skeleton rounded="full" className="size-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ol>
        ) : players.length > 0 ? (
          <ol className={BOX_LIST}>
            {players.map((player) => (
              <li key={player.id} className={cn(TOP_PLAYER_ROW, 'group relative')}>
                <span className="w-7 shrink-0 text-right">
                  <RankNumber rank={player.rank ?? 0} size="sm" />
                </span>
                <PlayerAvatar player={player} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                      to={playerPath(player.slug)}
                      className={cn(
                        ROW_LINK,
                        'truncate font-semibold text-text transition-colors group-hover:text-accent-soft',
                      )}
                    >
                      {player.name}
                    </Link>
                    <CountryFlag code={player.country_code} />
                  </div>
                  <p className="font-mono text-xs text-muted tabular-nums">
                    <span className="text-text">{formatPoints(player.total_points)}</span>
                    <span aria-hidden="true" className="font-sans">
                      {' pts'}
                    </span>
                    <span className="sr-only"> points</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : error ? (
          <ErrorState
            size="sm"
            titleAs="p"
            title="Couldn't load the top players"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <EmptyState
            size="sm"
            titleAs="p"
            icon={<IconUsers />}
            title="No ranked players yet"
            description="Players appear here after their first completion."
          />
        )}
      </div>
    </SidebarSection>
  )
}
