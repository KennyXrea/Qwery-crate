import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useLevels } from '../../hooks/useLevels'
import { usePlayer } from '../../hooks/usePlayer'
import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'
import { LevelCard } from '../level/LevelCard'
import { LevelCardSkeleton } from '../level/LevelCardSkeleton'
import { SECTION_LABELS } from '../level/level-visuals'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { IconClose, IconSearch, IconUsers } from '../ui/icons'
import { Pagination } from '../ui/Pagination'
import { Skeleton } from '../ui/Skeleton'
import { Spinner } from '../ui/Spinner'
import { LevelTable, LevelTableSkeleton } from './LevelTable'
import { pageCount, shownRange } from './list-options'
import {
  CLEARED_FILTERS,
  hasActiveFilters,
  isSearchActive,
  LIST_PAGE_SIZE,
  type ListParams,
  type ListView,
} from './list-params'
import { SKELETON_CARDS } from './list-visuals'
import type { UpdateListParams } from './useListParams'

type ListLevelsProps = {
  params: ListParams
  onChange: UpdateListParams
}

/**
 * The levels for the current URL state, with their result count, pagination and every
 * loading / error / empty state. The player filter is a slug in the URL: it is looked up first
 * (usePlayer) and the levels are only asked for once its id is known, so a shared
 * "?player=…" link never flashes the unfiltered list.
 */
export function ListLevels({ params, onChange }: ListLevelsProps) {
  const player = usePlayer(params.player)

  if (params.player === null) return <ListResults params={params} onChange={onChange} />
  if (player.isPending) return <ListResultsSkeleton view={params.view} />
  if (player.error) {
    return (
      <ErrorState
        title="Couldn't load that player"
        message={player.error.message}
        onRetry={() => void player.refetch()}
        retrying={player.isFetching}
      />
    )
  }
  if (!player.data) {
    return (
      <EmptyState
        icon={<IconUsers />}
        title="Player not found"
        description={
          <>
            There's no player called <span className="text-text">“{params.player}”</span>. They may
            have been renamed or removed.
          </>
        }
        action={
          <Button variant="secondary" onClick={() => onChange({ player: null })}>
            Show every player's levels
          </Button>
        }
      />
    )
  }
  return (
    <ListResults
      params={params}
      onChange={onChange}
      playerId={player.data.id}
      playerName={player.data.name}
    />
  )
}

type ListResultsProps = ListLevelsProps & {
  /** The player filter's id, once it is known. */
  playerId?: string
  playerName?: string
}

function ListResults({ params, onChange, playerId, playerName }: ListResultsProps) {
  const { data, isPending, error, refetch, isFetching, isPlaceholderData } = useLevels({
    section: params.section,
    search: params.q,
    difficulty: params.difficulty ?? undefined,
    playerId,
    sort: params.sort,
    page: params.page,
    pageSize: LIST_PAGE_SIZE,
  })
  const statusRef = useRef<HTMLParagraphElement>(null)

  if (isPending) return <ListResultsSkeleton view={params.view} />
  if (!data) {
    return (
      <ErrorState
        title="Couldn't load the list"
        message={error?.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  const sectionLabel = SECTION_LABELS[params.section]
  const totalPages = pageCount(data.total, LIST_PAGE_SIZE)
  const caption = `${sectionLabel} list levels${totalPages > 1 ? `, page ${params.page} of ${totalPages}` : ''}`
  const filtersApplied =
    isSearchActive(params.q) || params.difficulty !== null || params.player !== null
  const clearFilters = () => onChange(CLEARED_FILTERS)
  // "No levels match" has its own Clear filters button; don't show two.
  const showClearButton = hasActiveFilters(params) && !(data.total === 0 && filtersApplied)

  function goToPage(page: number) {
    onChange({ page })
    // Back to the top of the results, with keyboard focus there too (the pager may be far down).
    const status = statusRef.current
    status?.focus({ preventScroll: true })
    status?.scrollIntoView({ block: 'start' })
  }

  let count: ReactNode
  if (data.total === 0) {
    count = 'No levels'
  } else if (data.rows.length > 0 && data.total > data.rows.length) {
    const { from, to } = shownRange(params.page, LIST_PAGE_SIZE, data.rows.length)
    count = (
      <>
        <strong className="font-semibold text-text">
          {formatNumber(from)}–{formatNumber(to)}
        </strong>{' '}
        of <strong className="font-semibold text-text">{formatNumber(data.total)}</strong> levels
      </>
    )
  } else {
    count = (
      <>
        <strong className="font-semibold text-text">{formatNumber(data.total)}</strong>{' '}
        {data.total === 1 ? 'level' : 'levels'}
      </>
    )
  }

  let empty: ReactNode = null
  if (data.rows.length === 0) {
    if (data.total > 0) {
      empty = (
        <EmptyState
          title={`There's no page ${formatNumber(params.page)}`}
          description={`These levels fit on ${formatNumber(totalPages)} ${totalPages === 1 ? 'page' : 'pages'}.`}
          action={
            <Button variant="secondary" onClick={() => goToPage(totalPages)}>
              Go to page {formatNumber(totalPages)}
            </Button>
          }
        />
      )
    } else if (filtersApplied) {
      empty = (
        <EmptyState
          icon={<IconSearch />}
          title="No levels match"
          description={`Nothing in the ${sectionLabel} list matches these filters. Try another section, or clear the filters.`}
          action={
            <Button variant="secondary" leftIcon={<IconClose />} onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )
    } else {
      empty = (
        <EmptyState
          title={params.section === 'main' ? 'No levels yet' : `Nothing in ${sectionLabel} yet`}
          description={SECTION_EMPTY_TEXT[params.section]}
        />
      )
    }
  }

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p ref={statusRef} tabIndex={-1} role="status" className="text-sm text-muted outline-none">
          {count} in the {sectionLabel} list
          {playerName ? (
            <>
              {' '}
              beaten by <strong className="font-semibold text-text">{playerName}</strong>
            </>
          ) : null}
          {isPlaceholderData ? (
            <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-xs text-accent-soft">
              <Spinner size="sm" decorative />
              Updating…
            </span>
          ) : null}
        </p>
        {showClearButton ? (
          <Button variant="ghost" size="sm" leftIcon={<IconClose />} onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {params.q !== '' && !isSearchActive(params.q) ? (
        <p className="text-xs text-muted">Type at least 2 characters to search.</p>
      ) : null}

      <div
        aria-busy={isPlaceholderData || undefined}
        className={cn('mt-3 transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
      >
        {empty ??
          (params.view === 'table' ? (
            <LevelTable levels={data.rows} caption={caption} />
          ) : (
            <ol aria-label={caption} className="space-y-3">
              {data.rows.map((level, index) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  thumbnailLoading={params.page === 1 && index < 2 ? 'eager' : 'lazy'}
                />
              ))}
            </ol>
          ))}
      </div>

      <Pagination
        page={params.page}
        totalPages={totalPages}
        onPageChange={goToPage}
        label="List pages"
        className="mt-6"
      />
    </div>
  )
}

const SECTION_EMPTY_TEXT = {
  main: "The list is empty for now. Levels show up here as soon as they're added.",
  extended: 'Levels move down into Extended once the Main list is full.',
  legacy: 'Levels move down into Legacy once they drop out of the Extended list.',
} as const satisfies Record<ListParams['section'], string>

/** The results' loading placeholder in the shape of the chosen view. */
export function ListResultsSkeleton({ view }: { view: ListView }) {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading levels…
      </p>
      <div aria-hidden="true" className="flex min-h-10 items-center">
        <Skeleton className="h-4 w-48" />
      </div>
      {view === 'table' ? (
        <LevelTableSkeleton className="mt-3" />
      ) : (
        <ol aria-hidden="true" className="mt-3 space-y-3">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <LevelCardSkeleton key={i} />
          ))}
        </ol>
      )}
    </div>
  )
}
