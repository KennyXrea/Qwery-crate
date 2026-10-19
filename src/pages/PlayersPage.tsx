import { Link, useSearchParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { PlayerSearchBox } from '../components/player/PlayerSearchBox'
import { PlayersTable, PlayersTableSkeleton } from '../components/player/PlayersTable'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { IconArrowRight, IconSearch, IconUsers } from '../components/ui/icons'
import { TEXT_LINK } from '../components/ui/link-styles'
import { Pagination } from '../components/ui/Pagination'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlayers } from '../hooks/usePlayers'
import { cn } from '../lib/cn'
import { formatCount, formatNumber } from '../lib/format'
import { normalizeSearch } from '../lib/search'
import {
  parsePageParam,
  PLAYER_PAGE_PARAM,
  PLAYER_SEARCH_PARAM,
  PLAYERS_PAGE_SIZE,
  withParam,
} from './player-params'

/**
 * /players — the leaderboard: every player ranked by total points (players without a
 * completion last), with a search box (?q=, debounced) and pages of 25 (?page=). The previous
 * page stays on screen, dimmed, while the next one loads.
 */
export function PlayersPage() {
  usePageTitle('Players')

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get(PLAYER_SEARCH_PARAM) ?? ''
  const page = parsePageParam(searchParams.get(PLAYER_PAGE_PARAM))
  const activeSearch = normalizeSearch(search)

  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = usePlayers({
    search,
    page,
    pageSize: PLAYERS_PAGE_SIZE,
  })

  const loading = data === undefined && !error
  const total = data?.total ?? 0
  const rows = data?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(total / PLAYERS_PAGE_SIZE))

  /** A new search starts again at page 1. Typing replaces the history entry, so Back leaves. */
  function applySearch(next: string) {
    setSearchParams(
      (current) =>
        withParam(withParam(current, PLAYER_SEARCH_PARAM, next), PLAYER_PAGE_PARAM, null),
      { replace: true, preventScrollReset: true },
    )
  }

  function goToPage(next: number) {
    setSearchParams((current) => withParam(current, PLAYER_PAGE_PARAM, next > 1 ? next : null))
  }

  let content
  if (data === undefined && error) {
    content = (
      <ErrorState
        title="Couldn't load the leaderboard"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  } else if (loading || isPending) {
    content = <PlayersTableSkeleton />
  } else if (rows.length > 0) {
    content = (
      <PlayersTable
        players={rows}
        caption={
          activeSearch
            ? `Players matching “${activeSearch}”, ranked by total points`
            : 'Players ranked by total points'
        }
        className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
      />
    )
  } else if (total > 0) {
    content = (
      <EmptyState
        title="This page is empty"
        description={`The leaderboard only has ${formatCount(totalPages, 'page')}.`}
        action={
          <Button variant="secondary" onClick={() => goToPage(totalPages)}>
            Go to page {formatNumber(totalPages)}
          </Button>
        }
      />
    )
  } else if (activeSearch) {
    content = (
      <EmptyState
        icon={<IconSearch />}
        title={`No players match “${activeSearch}”`}
        description="Check the spelling, or search for part of the name."
        action={
          <Button variant="secondary" onClick={() => applySearch('')}>
            Clear search
          </Button>
        }
      />
    )
  } else {
    content = (
      <EmptyState
        icon={<IconUsers />}
        title="No players yet"
        description="Players show up here as soon as they're added, ranked by the levels they've beaten."
        action={
          <ButtonLink to="/list" variant="secondary" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        }
      />
    )
  }

  return (
    <PageShell
      eyebrow="Leaderboard"
      title="Players"
      description="Everyone in the group, ranked by the total points of the levels they've beaten."
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PlayerSearchBox value={search} onSearch={applySearch} className="w-full sm:max-w-sm" />
        <p role="status" className="text-sm text-muted sm:text-right">
          {statusText({ loading, total, rows: rows.length, page, activeSearch })}
        </p>
      </div>

      <div aria-busy={loading || isPlaceholderData ? true : undefined}>{content}</div>

      {rows.length > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          label="Leaderboard pages"
          className="mt-6"
        />
      ) : null}

      <div className="mt-8 max-w-2xl text-sm">
        <p className="text-muted">
          Total points are the sum of the points of every level a player has beaten (Legacy levels
          give none); players with the same total share a rank.
        </p>
        <Link to="/about" className={TEXT_LINK}>
          How points work
          <IconArrowRight />
        </Link>
      </div>
    </PageShell>
  )
}

/** The line next to the search box: "6 players", "2 players match “al”", "Showing 26–50 of 60 players". */
function statusText({
  loading,
  total,
  rows,
  page,
  activeSearch,
}: {
  loading: boolean
  total: number
  rows: number
  page: number
  activeSearch: string
}): string {
  if (loading) return 'Loading players…'
  if (total === 0) return ''
  if (activeSearch) {
    return `${formatCount(total, 'player')} ${total === 1 ? 'matches' : 'match'} “${activeSearch}”`
  }
  if (rows > 0 && total > PLAYERS_PAGE_SIZE) {
    const from = (page - 1) * PLAYERS_PAGE_SIZE + 1
    return `Showing ${formatNumber(from)}–${formatNumber(from + rows - 1)} of ${formatCount(total, 'player')}`
  }
  return formatCount(total, 'player')
}
