import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { SidebarSection } from '../components/layout/Sidebar'
import { RecentChangeItem } from '../components/shared/RecentChangeItem'
import { RecentChangeItemSkeleton } from '../components/shared/RecentChangeItemSkeleton'
import { RECENT_CHANGE_ICON } from '../components/shared/shared-visuals'
import { ButtonLink } from '../components/ui/ButtonLink'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconPlus,
  IconTrophy,
} from '../components/ui/icons'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRecentChanges } from '../hooks/useRecentChanges'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import { recentPath } from '../lib/paths'
import type { RecentChangeKind } from '../types/models'
import {
  RECENT_FILTERS,
  RECENT_PAGE_SIZE,
  dayHeading,
  feedSummary,
  groupChangesByDay,
  pageCount,
  readRecentParams,
  recentFilterOf,
  useLocalToday,
  withPage,
  type RecentDayGroup,
  type RecentFilter,
} from './recent-feed'

const PAGE_SIZE = RECENT_PAGE_SIZE

/** The row padding inside a day's card (shared by the real rows and their skeleton). */
const ROW = 'px-4 py-3 sm:px-5'

/** The vertical line that joins the days (behind the dots). */
const TIMELINE =
  'relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border'

/** One day on the timeline: room on the left for its dot. */
const DAY = 'relative pl-6 sm:pl-8'

const DOT = 'absolute top-2 left-0 size-[11px] rounded-full border-2'

/**
 * /recent — what changed lately, newest first, grouped by day: completions, new levels and
 * ranking moves. Filter chips (?kind=) and pages of 30 (?page=) live in the URL.
 */
export function RecentPage() {
  usePageTitle('Recent changes')
  const [searchParams, setSearchParams] = useSearchParams()
  const { kind, page } = readRecentParams(searchParams)
  const filter = recentFilterOf(kind)
  const today = useLocalToday()
  const summaryRef = useRef<HTMLParagraphElement>(null)

  const { data, isPending, isPlaceholderData, error, refetch, isFetching } = useRecentChanges({
    kind: kind ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = pageCount(total, PAGE_SIZE)
  const loading = isPending || isPlaceholderData

  function goToPage(next: number) {
    setSearchParams((current) => withPage(current, next))
    // The page scrolls back to the top; take keyboard focus there too, onto the summary line.
    summaryRef.current?.focus({ preventScroll: true })
  }

  let summary: ReactNode = null
  let content: ReactNode
  if (isPending) {
    summary = <LoadingText>Loading recent changes…</LoadingText>
    content = <TimelineSkeleton />
  } else if (!data) {
    content = (
      <ErrorState
        title="Couldn't load recent changes"
        message={error?.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  } else if (rows.length === 0) {
    content =
      total > 0 && page > 1 ? (
        <EmptyState
          title={`There is no page ${page}`}
          description={`This list only has ${formatCount(totalPages, 'page')}.`}
          action={
            <ButtonLink
              to={{ search: withPage(searchParams, totalPages).toString() }}
              variant="secondary"
            >
              Go to the last page
            </ButtonLink>
          }
        />
      ) : (
        <FeedEmptyState filter={filter} />
      )
  } else {
    summary = isPlaceholderData ? (
      <LoadingText>Loading…</LoadingText>
    ) : (
      feedSummary(filter, page, PAGE_SIZE, rows.length, total)
    )
    content = (
      <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
        <Timeline groups={groupChangesByDay(rows)} today={today} />
      </div>
    )
  }

  return (
    <PageShell
      eyebrow="Activity"
      title="Recent changes"
      description="New completions, new levels and ranking moves, newest first."
      sidebar={<FeedLegend />}
    >
      <FilterChips active={kind} />

      <div aria-busy={loading || undefined} className="mt-6">
        {/* Focused after a page change; read out (politely) whenever it changes. */}
        <p
          ref={summaryRef}
          tabIndex={-1}
          aria-live="polite"
          className="mb-4 min-h-5 text-sm text-muted outline-none"
        >
          {summary}
        </p>
        {content}
      </div>

      {rows.length > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          label="Recent changes pages"
          className="mt-8"
        />
      ) : null}
    </PageShell>
  )
}

function LoadingText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="sm" decorative className="text-accent" />
      {children}
    </span>
  )
}

// ── Filter chips ──────────────────────────────────────────────────────────────────────────────

/** The chip icons match the feed's: trophy, plus, and up/down arrows for moves. */
function FilterIcon({ kind }: { kind: RecentChangeKind }) {
  if (kind === 'record') return <IconTrophy />
  if (kind === 'level_added') return <IconPlus />
  return (
    <>
      <IconArrowUp className="-mr-2" />
      <IconArrowDown />
    </>
  )
}

/** All / Completions / New levels / Moves — real links (?kind=), the current one marked. */
function FilterChips({ active }: { active: RecentChangeKind | null }) {
  return (
    <nav aria-label="Filter recent changes">
      <ul className="flex flex-wrap gap-2">
        {RECENT_FILTERS.map((filter) => {
          const current = filter.kind === active
          return (
            <li key={filter.label}>
              <Link
                // A new filter starts again at page 1; the page doesn't jump back to the top.
                to={recentPath(filter.kind ?? undefined)}
                preventScrollReset
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4',
                  current
                    ? // Backgrounds vanish in forced-colors mode: underline the current chip there.
                      'border-accent-strong bg-accent-strong text-white forced-colors:underline forced-colors:decoration-2 forced-colors:underline-offset-4'
                    : 'border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-2 hover:text-text',
                )}
              >
                {filter.kind ? (
                  <span aria-hidden="true" className="inline-flex">
                    <FilterIcon kind={filter.kind} />
                  </span>
                ) : null}
                {filter.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ── The timeline ──────────────────────────────────────────────────────────────────────────────

function Timeline({ groups, today }: { groups: RecentDayGroup[]; today: string }) {
  return (
    <div className={TIMELINE}>
      {groups.map((group, index) => (
        // A day can repeat when a page starts in the middle of it, so the index is in the key.
        <DayGroup key={`${group.day}:${index}`} group={group} today={today} />
      ))}
    </div>
  )
}

function DayGroup({ group, today }: { group: RecentDayGroup; today: string }) {
  const headingId = useId()
  const heading = dayHeading(group.day, today)
  const isToday = group.day === today

  return (
    <div className={DAY}>
      <span
        aria-hidden="true"
        className={cn(DOT, isToday ? 'border-accent bg-accent' : 'border-border-strong bg-bg')}
      />
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-lg font-semibold text-text">
          <time dateTime={group.day}>{heading.label}</time>
        </h2>
        {heading.detail ? <p className="text-sm text-muted">{heading.detail}</p> : null}
        {group.changes.length > 1 ? (
          <p className="ml-auto font-mono text-xs text-muted">
            {formatCount(group.changes.length, 'change')}
          </p>
        ) : null}
      </div>
      <Card padding="none" className="overflow-hidden">
        <ol aria-labelledby={headingId} className="divide-y divide-border">
          {group.changes.map((change) => (
            <RecentChangeItem key={`${change.kind}:${change.id}`} change={change} className={ROW} />
          ))}
        </ol>
      </Card>
    </div>
  )
}

/** Two days of placeholder rows, shaped like the timeline (hidden from screen readers). */
function TimelineSkeleton() {
  return (
    <div aria-hidden="true" className={TIMELINE}>
      {[5, 3].map((count, day) => (
        <div key={day} className={DAY}>
          <span className={cn(DOT, 'border-border-strong bg-bg')} />
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3.5 w-36 max-sm:hidden" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          <Card padding="none" className="overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: count }, (_, row) => (
                <RecentChangeItemSkeleton key={row} as="div" className={ROW} />
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

// ── Empty states and the sidebar ──────────────────────────────────────────────────────────────

const EMPTY_COPY: Readonly<Record<RecentChangeKind | 'all', { title: string; text: string }>> = {
  all: {
    title: 'Nothing has changed yet',
    text: 'New completions, new levels and ranking moves will show up here as they happen.',
  },
  record: {
    title: 'No completions yet',
    text: 'When someone beats a level on the list, it shows up here.',
  },
  level_added: {
    title: 'No new levels yet',
    text: 'Levels added to the list will show up here.',
  },
  level_moved: {
    title: 'No ranking moves yet',
    text: 'When a level is moved up or down the list, it shows up here.',
  },
}

function FeedEmptyState({ filter }: { filter: RecentFilter }) {
  const copy = EMPTY_COPY[filter.kind ?? 'all']
  return (
    <EmptyState
      title={copy.title}
      description={copy.text}
      action={
        filter.kind ? (
          <ButtonLink to={recentPath()} variant="secondary">
            Show all changes
          </ButtonLink>
        ) : (
          <ButtonLink to="/list" variant="secondary" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        )
      }
    />
  )
}

function LegendRow({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode
  tone: string
  title: string
  children: ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className={cn(RECENT_CHANGE_ICON, tone)}>
        {icon}
      </span>
      <p className="min-w-0 pt-0.5">
        <span className="font-semibold text-text">{title}.</span> {children}
      </p>
    </li>
  )
}

/** What each kind of entry means (same icons and colours as the feed). */
function FeedLegend() {
  return (
    <SidebarSection title="What shows up here">
      <ul className="space-y-3">
        <LegendRow
          icon={<IconTrophy />}
          tone="border-gold/30 bg-gold/10 text-gold"
          title="Completions"
        >
          A player beat a level, with their attempts and video when we have them.
        </LegendRow>
        <LegendRow
          icon={<IconPlus />}
          tone="border-accent/30 bg-accent/10 text-accent-soft"
          title="New levels"
        >
          A level joined the list at the position shown.
        </LegendRow>
        <LegendRow
          icon={<IconArrowUp />}
          tone="border-success/30 bg-success/10 text-success"
          title="Moves"
        >
          A level was moved up (green) or down (red) the ranking. Levels pushed along by that move
          aren&apos;t listed separately.
        </LegendRow>
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-xs">
        Completions are listed on the day they were beaten, or the day they were added when no date
        was given.
      </p>
    </SidebarSection>
  )
}
