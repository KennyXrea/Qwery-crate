import { PageShell } from '../components/layout/PageShell'
import { LevelCard } from '../components/level/LevelCard'
import { LevelCardSkeleton } from '../components/level/LevelCardSkeleton'
import { LatestRecordsBox } from '../components/shared/LatestRecordsBox'
import { RecentChangesBox } from '../components/shared/RecentChangesBox'
import { TopPlayersBox } from '../components/shared/TopPlayersBox'
import { ViewAllLink } from '../components/shared/ViewAllLink'
import { SiteTotals, SiteTotalsSkeleton } from '../components/stats/SiteTotals'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { IconArrowRight } from '../components/ui/icons'
import { useLevels } from '../hooks/useLevels'
import { SITE_NAME, usePageTitle } from '../hooks/usePageTitle'
import { useSettings } from '../hooks/useSettings'
import { useSiteStats } from '../hooks/useSiteStats'

/** How many levels the "Top of the list" section shows. */
const TOP_LEVELS = 5

/** Main content | 20rem side column on large screens, like the list page's sidebar. */
const TWO_COLUMNS = 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8'

/** Totals: 2 per row on phones, 4 in a strip on tablets, 2 × 2 beside the hero on desktops. */
const TOTALS_GRID = 'md:grid-cols-4 lg:grid-cols-2'

export function HomePage() {
  usePageTitle()

  return (
    <PageShell>
      <div className={`${TWO_COLUMNS} items-center pt-2 sm:pt-6`}>
        <Hero />
        <TotalsStrip />
      </div>

      <div className={`${TWO_COLUMNS} mt-12 items-start sm:mt-16`}>
        <TopLevels />
        <div className="space-y-4">
          <TopPlayersBox limit={5} />
          <LatestRecordsBox limit={5} title="Recent completions" />
        </div>
      </div>

      <div className="mt-6 lg:mt-8">
        <RecentChangesBox limit={5} />
      </div>
    </PageShell>
  )
}

function Hero() {
  const { data: settings } = useSettings()
  // Until the settings arrive (or if they can't), the built-in name is shown.
  const name = settings?.site_name.trim() || SITE_NAME
  const lastSpace = name.lastIndexOf(' ')
  const head = lastSpace > 0 ? name.slice(0, lastSpace) : ''
  const tail = lastSpace > 0 ? name.slice(lastSpace + 1) : name

  return (
    <section aria-labelledby="home-title" className="min-w-0 animate-fade-in">
      <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
        Geometry Dash · Friend group list
      </p>
      <h1
        id="home-title"
        className="mt-3 text-4xl leading-tight font-bold wrap-break-word text-text sm:text-6xl"
      >
        {head ? `${head} ` : null}
        <span className={head ? 'text-accent' : undefined}>{tail}</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted sm:text-xl">
        Our friend group's Geometry Dash list — ranked by us, beaten by us.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink
          to="/list"
          size="lg"
          rightIcon={<IconArrowRight />}
          className="w-full sm:w-auto"
        >
          View the list
        </ButtonLink>
        <ButtonLink to="/players" size="lg" variant="secondary" className="w-full sm:w-auto">
          Players
        </ButtonLink>
      </div>
    </section>
  )
}

function TotalsStrip() {
  const { data, isPending, error, refetch, isFetching } = useSiteStats()

  return (
    <section aria-labelledby="home-totals-title" className="min-w-0">
      <h2 id="home-totals-title" className="sr-only">
        Site totals
      </h2>
      <div aria-busy={isPending || undefined}>
        {isPending ? (
          <SiteTotalsSkeleton columns={2} className={TOTALS_GRID} />
        ) : data ? (
          <SiteTotals stats={data} columns={2} className={TOTALS_GRID} />
        ) : (
          <ErrorState
            size="sm"
            titleAs="h3"
            title="Couldn't load the totals"
            message={error?.message}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}
      </div>
    </section>
  )
}

function TopLevels() {
  const { data, isPending, error, refetch, isFetching } = useLevels({ pageSize: TOP_LEVELS })
  const levels = data?.rows ?? []

  return (
    <section aria-labelledby="home-top-title" className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="home-top-title" className="text-xl font-semibold text-text sm:text-2xl">
          Top of the list
        </h2>
        <ViewAllLink to="/list" label="levels" />
      </div>
      {isPending ? (
        <ol aria-busy="true" className="space-y-3">
          {Array.from({ length: TOP_LEVELS }, (_, i) => (
            <LevelCardSkeleton key={i} />
          ))}
        </ol>
      ) : levels.length > 0 ? (
        <ol className="space-y-3">
          {levels.map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              titleAs="h3"
              thumbnailLoading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </ol>
      ) : error ? (
        <ErrorState
          size="sm"
          titleAs="h3"
          title="Couldn't load the top levels"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <EmptyState
          size="sm"
          titleAs="h3"
          title="No levels yet"
          description="The first levels appear here as soon as they're added to the list."
        />
      )}
    </section>
  )
}
