import type { ReactNode } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { IconArrowRight, IconInfo } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'

const SECTIONS = [
  { name: 'Main', detail: 'The top of the list. Worth the most points.' },
  { name: 'Extended', detail: 'The next stretch of levels. Still worth points.' },
  { name: 'Legacy', detail: 'Levels pushed off the end. Kept for history, worth 0 points.' },
] as const

export function AboutPage() {
  usePageTitle('About')

  return (
    <PageShell
      eyebrow="About"
      title="About Qwerty Crate"
      description="A Geometry Dash list made by and for our friend group."
    >
      <div className="max-w-3xl space-y-4 sm:space-y-6">
        <AboutSection id="about-what" title="What this is">
          <p>
            Qwerty Crate is our friend group's own Geometry Dash list. It ranks the hardest levels
            that people in the group have beaten, keeps track of who beat what, and turns it all
            into a friendly leaderboard.
          </p>
          <p>
            It's a hobby project: the rankings are our opinion, decided together, and only cover
            levels our group has actually completed.
          </p>
        </AboutSection>

        <AboutSection id="about-ranking" title="How the ranking works">
          <p>
            We set each level's position by hand, as a group. When a new level is placed, every
            level below it moves down one spot. The list is split into three sections by position:
          </p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {SECTIONS.map((section) => (
              <li key={section.name} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="font-display font-semibold text-text">{section.name}</p>
                <p className="mt-1 text-sm text-muted">{section.detail}</p>
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection id="about-points" title="How points work">
          <p>
            Points come from a level's <strong className="text-text">position</strong>, using a
            formula the admins can tune in the settings. #1 is worth the most, each position below
            it is worth a little less, and points never drop below a minimum, except in Legacy,
            where levels are worth 0. Admins can also give a single level a fixed points value when
            the group agrees.
          </p>
          <p className="rounded-xl border border-border bg-bg/60 px-4 py-3 font-mono text-sm text-text">
            points = max(minimum, top × decay<sup>position − 1</sup>)
          </p>
          <p>
            A player's score is the total points of every level they've beaten. Points are
            calculated from positions rather than stored, so when a level moves, everyone's score
            updates straight away.
          </p>
          <EmptyState
            titleAs="h3"
            icon={<IconInfo />}
            title="Live numbers coming soon"
            description="The current top score, decay and minimum, with a table of points per position, will be shown here once the settings are connected."
          />
        </AboutSection>

        <AboutSection id="about-disclaimer" title="The small print">
          <p>
            Qwerty Crate is an unofficial fan project made for fun.{' '}
            <strong className="text-text">Not affiliated with RobTop Games or Pointercrate.</strong>{' '}
            Geometry Dash belongs to RobTop Games. All artwork on this site is our own.
          </p>
        </AboutSection>

        <div className="pt-2">
          <ButtonLink to="/list" rightIcon={<IconArrowRight />}>
            View the list
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  )
}

function AboutSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold text-text">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-text/90">{children}</div>
    </Card>
  )
}
