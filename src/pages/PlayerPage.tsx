import { useId } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { CompletionsList, CompletionsListSkeleton } from '../components/player/CompletionsList'
import { CompletionsSortToggle } from '../components/player/CompletionsSortToggle'
import {
  DifficultyBreakdown,
  DifficultyBreakdownSkeleton,
} from '../components/player/DifficultyBreakdown'
import { PlayerHeader, PlayerHeaderSkeleton } from '../components/player/PlayerHeader'
import { PlayerNotFound } from '../components/player/PlayerNotFound'
import { difficultyBreakdown, parseCompletionSort } from '../components/player/player-page-visuals'
import type { CompletionSort } from '../components/player/player-page-visuals'
import { PlayerStatGrid, PlayerStatGridSkeleton } from '../components/player/PlayerStatGrid'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { IconArrowRight, IconChevronLeft, IconTrophy } from '../components/ui/icons'
import { TEXT_LINK } from '../components/ui/link-styles'
import { Skeleton } from '../components/ui/Skeleton'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlayer, usePlayerRecords } from '../hooks/usePlayer'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import type { Player } from '../types/models'
import { PLAYER_SORT_PARAM, withParam } from './player-params'

/** "← All players", above the player's header. */
function BackLink() {
  return (
    <Link to="/players" className={cn(TEXT_LINK, 'mb-4 text-sm')}>
      <IconChevronLeft />
      All players
    </Link>
  )
}

/**
 * /player/:slug — one player's profile: header (avatar, name, rank, country, channel, bio),
 * their stats, a difficulty breakdown of what they've beaten and the table of completed levels
 * (?sort=position | date). Unknown slugs get a "Player not found" page.
 */
export function PlayerPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = parseCompletionSort(searchParams.get(PLAYER_SORT_PARAM))

  const { data: player, error, isFetching, refetch } = usePlayer(slug)

  usePageTitle(player ? player.name : player === null ? 'Player not found' : 'Player')

  function changeSort(next: CompletionSort) {
    setSearchParams(
      (current) => withParam(current, PLAYER_SORT_PARAM, next === 'position' ? null : next),
      { preventScrollReset: true },
    )
  }

  if (player === undefined && error) {
    return (
      <PageShell
        eyebrow="Player"
        title="Couldn't load this player"
        actions={
          <ButtonLink to="/players" variant="secondary" leftIcon={<IconChevronLeft />}>
            All players
          </ButtonLink>
        }
      >
        <ErrorState
          titleAs="p"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </PageShell>
    )
  }

  if (player === undefined) return <PlayerPageSkeleton />

  if (player === null) {
    return (
      <PageShell>
        <PlayerNotFound slug={slug} />
      </PageShell>
    )
  }

  return <PlayerProfile player={player} sort={sort} onSortChange={changeSort} />
}

function PlayerProfile({
  player,
  sort,
  onSortChange,
}: {
  player: Player
  sort: CompletionSort
  onSortChange: (sort: CompletionSort) => void
}) {
  const headingId = useId()
  const records = usePlayerRecords(player.id, sort)
  const completions = records.data
  const loadingRecords = completions === undefined && !records.error
  const expected = completions?.length ?? player.completions

  let list
  if (completions === undefined && records.error) {
    list = (
      <ErrorState
        size="sm"
        titleAs="h3"
        title="Couldn't load the completed levels"
        message={records.error.message}
        onRetry={() => void records.refetch()}
        retrying={records.isFetching}
      />
    )
  } else if (completions === undefined) {
    list = <CompletionsListSkeleton rows={Math.min(Math.max(player.completions, 1), 8)} />
  } else if (completions.length === 0) {
    list = (
      <EmptyState
        titleAs="h3"
        icon={<IconTrophy />}
        title="No completions yet"
        description={`${player.name} hasn't beaten a level on the list yet. Their completions will show up here.`}
        action={
          <ButtonLink to="/list" variant="secondary" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        }
      />
    )
  } else {
    list = (
      <CompletionsList
        completions={completions}
        sort={sort}
        caption={`Levels ${player.name} has beaten, ${sort === 'date' ? 'newest first' : 'hardest first'}`}
        className={cn('transition-opacity', records.isPlaceholderData && 'opacity-60')}
      />
    )
  }

  return (
    <PageShell>
      <BackLink />
      <PlayerHeader player={player} />

      <PlayerStatGrid player={player} className="mt-8" />

      {loadingRecords && player.completions > 0 ? (
        <DifficultyBreakdownSkeleton className="mt-6" />
      ) : completions && completions.length > 0 ? (
        <DifficultyBreakdown counts={difficultyBreakdown(completions)} className="mt-6" />
      ) : null}

      <section aria-labelledby={headingId} className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h2 id={headingId} className="text-xl font-semibold text-text sm:text-2xl">
              Completed levels
            </h2>
            <p className="mt-1 text-sm text-muted">{formatCount(expected, 'level')}</p>
          </div>
          {/* Stays when loading fails, so the other order is still one tap away. */}
          {expected > 0 ? <CompletionsSortToggle value={sort} onChange={onSortChange} /> : null}
        </div>
        <div aria-busy={loadingRecords || records.isPlaceholderData ? true : undefined}>{list}</div>
      </section>
    </PageShell>
  )
}

/** The whole profile's shape while the player loads. */
function PlayerPageSkeleton() {
  return (
    <PageShell>
      <BackLink />
      <div aria-busy="true">
        <p role="status" className="sr-only">
          Loading player…
        </p>
        <PlayerHeaderSkeleton />
        <PlayerStatGridSkeleton className="mt-8" />
        <DifficultyBreakdownSkeleton className="mt-6" />
        <div aria-hidden="true" className="mt-10">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="mt-2 mb-4 h-4 w-16" />
          <CompletionsListSkeleton />
        </div>
      </div>
    </PageShell>
  )
}
