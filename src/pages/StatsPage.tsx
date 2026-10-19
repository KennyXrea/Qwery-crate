import { PageShell } from '../components/layout/PageShell'
import { ViewAllLink } from '../components/shared/ViewAllLink'
import { DifficultyChart, DifficultyChartSkeleton } from '../components/stats/DifficultyChart'
import {
  HardestPerPlayerList,
  HardestPerPlayerListSkeleton,
} from '../components/stats/HardestPerPlayerList'
import {
  MonthlyCompletionsChart,
  MonthlyCompletionsChartSkeleton,
} from '../components/stats/MonthlyCompletionsChart'
import { SiteTotals, SiteTotalsSkeleton } from '../components/stats/SiteTotals'
import { IconChart } from '../components/stats/StatsIcons'
import { StatsSection } from '../components/stats/StatsSection'
import { TopLevelsList, TopLevelsListSkeleton } from '../components/stats/TopLevelsList'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlayers } from '../hooks/usePlayers'
import { useSiteStats } from '../hooks/useSiteStats'
import { formatCount } from '../lib/format'
import type { SiteStats } from '../types/models'

/** The leaderboard page size the "hardest level per player" list reads (the API's maximum). */
const HARDEST_PLAYERS_PAGE_SIZE = 100

const SECTION_GRID = 'mt-6 grid gap-6 lg:grid-cols-2'

export function StatsPage() {
  usePageTitle('Stats')
  const stats = useSiteStats()
  const isEmpty = stats.data !== undefined && stats.data.levels === 0 && stats.data.records === 0

  return (
    <PageShell
      eyebrow="By the numbers"
      title="Stats"
      description="Totals and trends across the whole list."
    >
      {stats.isPending ? (
        <StatsLoading />
      ) : stats.data === undefined ? (
        <ErrorState
          title="Couldn't load the stats"
          message={stats.error?.message}
          onRetry={() => void stats.refetch()}
          retrying={stats.isFetching}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<IconChart />}
          title="Nothing to count yet"
          description="Totals, charts and top fives appear here as soon as the first levels and records are added."
          action={<ButtonLink to="/list">View the list</ButtonLink>}
        />
      ) : (
        <StatsContent stats={stats.data} />
      )}

      {isEmpty ? null : <HardestSection />}
    </PageShell>
  )
}

function StatsContent({ stats }: { stats: SiteStats }) {
  return (
    <>
      <section aria-labelledby="stats-totals-title">
        <h2 id="stats-totals-title" className="sr-only">
          Totals
        </h2>
        <SiteTotals stats={stats} />
      </section>

      <div className={SECTION_GRID}>
        <StatsSection
          title="Levels by difficulty"
          description={`In-game difficulty of the ${formatCount(stats.levels, 'level')} on the list, hardest first.`}
        >
          {stats.levels > 0 ? (
            <DifficultyChart distribution={stats.difficultyDistribution} />
          ) : (
            <EmptyState size="sm" titleAs="h3" title="No levels yet" />
          )}
        </StatsSection>

        <StatsSection
          title="Completions per month"
          description="By the date each level was beaten."
        >
          <MonthlyCompletionsChart
            months={stats.completionsPerMonth}
            undated={stats.undatedCompletions}
          />
        </StatsSection>

        <StatsSection
          title="Most enjoyed levels"
          description="Highest average enjoyment rating, out of 10."
        >
          <TopLevelsList levels={stats.mostEnjoyed} metric="enjoyment" />
        </StatsSection>

        <StatsSection title="Most attempts" description="Most attempts per completion, on average.">
          <TopLevelsList levels={stats.mostAttempts} metric="attempts" />
        </StatsSection>
      </div>
    </>
  )
}

function StatsLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading the stats…</span>
      <SiteTotalsSkeleton />
      <div className={SECTION_GRID}>
        <StatsSection title="Levels by difficulty" busy>
          <DifficultyChartSkeleton />
        </StatsSection>
        <StatsSection title="Completions per month" busy>
          <MonthlyCompletionsChartSkeleton />
        </StatsSection>
        <StatsSection title="Most enjoyed levels" busy>
          <TopLevelsListSkeleton />
        </StatsSection>
        <StatsSection title="Most attempts" busy>
          <TopLevelsListSkeleton />
        </StatsSection>
      </div>
    </div>
  )
}

/** Its own query (the leaderboard), so it loads and fails separately from the rest. */
function HardestSection() {
  const players = usePlayers({ pageSize: HARDEST_PLAYERS_PAGE_SIZE })

  return (
    <StatsSection
      title="Hardest level per player"
      description="The highest-placed level each player has beaten."
      action={<ViewAllLink to="/players" label="players" />}
      busy={players.isPending}
      className="mt-6"
    >
      {players.isPending ? (
        <HardestPerPlayerListSkeleton />
      ) : players.data ? (
        <HardestPerPlayerList players={players.data.rows} total={players.data.total} />
      ) : (
        <ErrorState
          size="sm"
          titleAs="h3"
          title="Couldn't load the players"
          message={players.error?.message}
          onRetry={() => void players.refetch()}
          retrying={players.isFetching}
        />
      )}
    </StatsSection>
  )
}
