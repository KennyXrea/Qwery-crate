import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AboutContents } from '../components/about/AboutContents'
import { aboutSectionTitle } from '../components/about/about-sections'
import type { AboutSectionId } from '../components/about/about-sections'
import { PointsFormula, PointsFormulaSkeleton } from '../components/about/PointsFormula'
import { SectionRangeCards } from '../components/about/SectionRangeCards'
import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { IconArrowRight } from '../components/ui/icons'
import { ACCENT_INLINE_LINK } from '../components/ui/link-styles'
import { SITE_NAME, usePageTitle } from '../hooks/usePageTitle'
import { useSettings } from '../hooks/useSettings'
import { pointsSettingsFromRow } from '../lib/points'

export function AboutPage() {
  usePageTitle('About')
  const { data, isPending, error, refetch, isFetching } = useSettings()
  const settings = data ? pointsSettingsFromRow(data) : null
  const siteName = data?.site_name.trim() || SITE_NAME

  return (
    <PageShell
      eyebrow="About"
      title={`About ${siteName}`}
      description="A Geometry Dash list made by and for our friend group."
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,48rem)_13rem] lg:gap-12">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <AboutSection id="about-what">
            <p>
              {siteName} is our friend group's own Geometry Dash list. It ranks the hardest levels
              that people in the group have beaten, keeps track of who beat what (with attempts,
              enjoyment ratings and videos), and turns it all into a friendly leaderboard.
            </p>
            <p>
              It's a hobby project: the rankings are our opinion, decided together, and only cover
              levels our group has actually completed.
            </p>
          </AboutSection>

          <AboutSection id="about-ranking">
            <p>
              We set each level's position by hand, as a group. When a new level is placed, every
              level below it moves down one spot, and every move is saved in the level's history and
              on the{' '}
              <Link to="/recent" className={ACCENT_INLINE_LINK}>
                Recent changes
              </Link>{' '}
              page. The list is split into three sections by position:
            </p>
            <SectionRangeCards settings={settings} loading={isPending} />
            <p className="text-sm text-muted">
              Sections follow the positions, so a new level near the top pushes the last Main level
              into Extended, and the last Extended level into Legacy.
            </p>
          </AboutSection>

          <AboutSection id="about-points">
            <p>
              Points come from a level's <strong className="text-text">position</strong>, using a
              formula the admins can tune in the settings. #1 is worth the most, each place below it
              keeps the same share of the points above it, and points never drop below a minimum,
              except in Legacy, where levels are worth 0. Admins can also give a single level a
              fixed points value when the group agrees.
            </p>
            <div aria-busy={isPending || undefined}>
              {isPending ? (
                <PointsFormulaSkeleton />
              ) : settings ? (
                <PointsFormula settings={settings} />
              ) : (
                <ErrorState
                  size="sm"
                  titleAs="h3"
                  title="Couldn't load the current settings"
                  message={error?.message}
                  onRetry={() => void refetch()}
                  retrying={isFetching}
                />
              )}
            </div>
            <p>
              A player's score is the total points of every level they've beaten. Points are
              calculated from positions rather than stored, so when a level moves, everyone's score
              updates straight away. See who's ahead on the{' '}
              <Link to="/players" className={ACCENT_INLINE_LINK}>
                players leaderboard
              </Link>
              .
            </p>
          </AboutSection>

          <AboutSection id="about-disclaimer">
            <p>
              {siteName} is an unofficial fan project made for fun.{' '}
              <strong className="text-text">
                Not affiliated with RobTop Games or Pointercrate.
              </strong>{' '}
              Geometry Dash belongs to RobTop Games. All artwork on this site is our own.
            </p>
          </AboutSection>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink to="/list" rightIcon={<IconArrowRight />} className="w-full sm:w-auto">
              View the list
            </ButtonLink>
            <ButtonLink to="/stats" variant="secondary" className="w-full sm:w-auto">
              See the stats
            </ButtonLink>
          </div>
        </div>

        <AboutContents />
      </div>
    </PageShell>
  )
}

/**
 * One card of the page. Its heading can take focus, for the "On this page" links. When the page
 * jumps to it, scroll-mt-6 (on top of the page's own room for the sticky header) keeps the
 * card's top edge in view, not just the heading.
 */
function AboutSection({ id, children }: { id: AboutSectionId; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id}>
      <h2 id={id} tabIndex={-1} className="scroll-mt-6 text-xl font-semibold text-text">
        {aboutSectionTitle(id)}
      </h2>
      <div className="mt-3 space-y-4 text-text/90">{children}</div>
    </Card>
  )
}
