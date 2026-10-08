/*
 * TEMPORARY developer page (/dev/data): proves the data layer is wired up by showing the live
 * results of the React Query hooks in src/hooks as JSON. Only reachable with `npm run dev`
 * (production builds leave it out, see src/pages/lazy.tsx). Delete this file, its route in
 * src/routes.tsx and DevDataRoute in src/pages/lazy.tsx at the end of Phase 4.
 */
import { useId } from 'react'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../../api/errors'
import { PageShell } from '../../components/layout/PageShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/ErrorState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { useAdjacentLevels, useLevel, useLevelHistory, useLevelRecords } from '../../hooks/useLevel'
import { useLevels } from '../../hooks/useLevels'
import { usePageTitle } from '../../hooks/usePageTitle'
import { usePlayer, usePlayerRecords } from '../../hooks/usePlayer'
import { usePlayers } from '../../hooks/usePlayers'
import { useRecentChanges } from '../../hooks/useRecentChanges'
import { useRecentRecords } from '../../hooks/useRecentRecords'
import { useSearch } from '../../hooks/useSearch'
import { usePointsSettings, useSettings } from '../../hooks/useSettings'
import { useSiteStats } from '../../hooks/useSiteStats'

const SAMPLE_LEVEL_SLUG = 'sample-level-1'
const SAMPLE_SEARCH = 'sample'

type AnyQuery = UseQueryResult<unknown, ApiError>

export function DevDataPage() {
  usePageTitle('Data wiring')

  const settings = useSettings()
  const pointsSettings = usePointsSettings()

  const levels = useLevels({ section: 'main', page: 1 })
  const level = useLevel(SAMPLE_LEVEL_SLUG)
  const levelRecords = useLevelRecords(level.data?.id)
  const levelHistory = useLevelHistory(level.data?.id)
  const adjacent = useAdjacentLevels(level.data?.position)

  const players = usePlayers({ page: 1 })
  const player = usePlayer(players.data?.rows[0]?.slug)
  const playerRecords = usePlayerRecords(player.data?.id)

  const recentChanges = useRecentChanges({ page: 1 })
  const recentRecords = useRecentRecords()
  const stats = useSiteStats()
  const search = useSearch(SAMPLE_SEARCH)

  return (
    <PageShell
      eyebrow="Developer only"
      title="Data wiring"
      description="Live results of the data hooks (src/hooks), read from Supabase with the publishable key. Only available while developing; this page is removed at the end of Phase 4."
    >
      <div className="space-y-10">
        <DataGroup title="Settings">
          <QueryBlock label="useSettings()" query={settings} />
          <ValueBlock
            label="usePointsSettings()"
            note="Database defaults until the settings have loaded."
            value={pointsSettings}
          />
        </DataGroup>

        <DataGroup title="Levels">
          <QueryBlock label="useLevels({ section: 'main', page: 1 })" query={levels} />
          <QueryBlock label={`useLevel('${SAMPLE_LEVEL_SLUG}')`} query={level} />
          <QueryBlock
            label="useLevelRecords(level.id)"
            waitingFor="the level's id"
            query={levelRecords}
          />
          <QueryBlock
            label="useLevelHistory(level.id)"
            waitingFor="the level's id"
            query={levelHistory}
          />
          <QueryBlock
            label="useAdjacentLevels(level.position)"
            waitingFor="the level's position"
            query={adjacent}
          />
        </DataGroup>

        <DataGroup title="Players">
          <QueryBlock label="usePlayers({ page: 1 })" query={players} />
          <QueryBlock
            label="usePlayer(first player's slug)"
            waitingFor="the leaderboard's first player"
            query={player}
          />
          <QueryBlock
            label="usePlayerRecords(player.id)"
            waitingFor="the player's id"
            query={playerRecords}
          />
        </DataGroup>

        <DataGroup title="Recent activity">
          <QueryBlock label="useRecentChanges({ page: 1 })" query={recentChanges} />
          <QueryBlock label="useRecentRecords()" query={recentRecords} />
        </DataGroup>

        <DataGroup title="Stats and search">
          <QueryBlock label="useSiteStats()" query={stats} />
          <QueryBlock label={`useSearch('${SAMPLE_SEARCH}')`} query={search} />
        </DataGroup>
      </div>
    </PageShell>
  )
}

function DataGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xl font-semibold text-text">
        {title}
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  )
}

const STATUS_TONE = { pending: 'neutral', success: 'success', error: 'danger' } as const
const FETCH_TONE = { idle: 'neutral', fetching: 'accent', paused: 'gold' } as const

function QueryBlock({
  label,
  query,
  waitingFor,
}: {
  label: string
  query: AnyQuery
  /** What a query that hasn't started yet is waiting for (it depends on another query). */
  waitingFor?: string
}) {
  const headingId = useId()
  const waiting = query.isPending && query.fetchStatus === 'idle'

  let body: ReactNode
  if (query.isError) {
    const { error } = query
    body = (
      <ErrorState
        titleAs="p"
        title="This query failed"
        message={
          <>
            <span className="block">{error.message}</span>
            <span className="mt-1 block font-mono text-xs">
              kind: {error.kind}
              {error.code ? ` · code: ${error.code}` : ''}
              {error.status !== null ? ` · status: ${error.status}` : ''}
            </span>
          </>
        }
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  } else if (query.isSuccess) {
    body = <JsonView label={label} value={query.data} />
  } else if (waiting) {
    body = <p className="text-sm text-muted">Waiting for {waitingFor ?? 'its input'}…</p>
  } else {
    body = (
      <>
        <p className="sr-only">Loading…</p>
        <SkeletonText lines={5} />
      </>
    )
  }

  return (
    <Card
      as="section"
      padding="sm"
      aria-labelledby={headingId}
      aria-busy={query.isFetching}
      className="min-w-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 id={headingId} className="font-mono text-sm font-semibold break-all text-text">
            {label}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[query.status]}>{query.status}</Badge>
            <Badge tone={FETCH_TONE[query.fetchStatus]}>{query.fetchStatus}</Badge>
            {query.isPlaceholderData ? <Badge tone="gold">placeholder</Badge> : null}
            {query.isSuccess ? (
              <span className="text-xs text-muted">{describeData(query.data)}</span>
            ) : null}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void query.refetch()}
          loading={query.isFetching}
          disabled={waiting}
        >
          Refetch
        </Button>
      </div>
      <div className="mt-4">{body}</div>
    </Card>
  )
}

function ValueBlock({ label, note, value }: { label: string; note?: string; value: unknown }) {
  const headingId = useId()
  return (
    <Card as="section" padding="sm" aria-labelledby={headingId} className="min-w-0">
      <h3 id={headingId} className="font-mono text-sm font-semibold break-all text-text">
        {label}
      </h3>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
      <div className="mt-4">
        <JsonView label={label} value={value} />
      </div>
    </Card>
  )
}

function JsonView({ label, value }: { label: string; value: unknown }) {
  return (
    // Focusable so keyboard users can scroll a long result.
    <pre
      tabIndex={0}
      aria-label={`${label} result`}
      className="max-h-96 overflow-auto rounded-xl border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-text"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

/** A one-line summary of a result: "12 of 12 rows", "3 items", "not found (null)". */
function describeData(data: unknown): string {
  if (data === null) return 'not found (null)'
  if (Array.isArray(data)) return `${data.length} ${data.length === 1 ? 'item' : 'items'}`
  if (typeof data === 'object' && data !== null && 'rows' in data && 'total' in data) {
    const { rows, total } = data
    if (Array.isArray(rows) && typeof total === 'number') {
      return `${rows.length} of ${total} ${total === 1 ? 'row' : 'rows'}`
    }
  }
  return 'loaded'
}
