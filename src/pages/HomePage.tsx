import { Link } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { Card } from '../components/ui/Card'
import { STRETCHED_LINK } from '../components/ui/card-link'
import { IconArrowRight, IconInfo } from '../components/ui/icons'
import { RankNumber } from '../components/ui/RankNumber'
import { Skeleton } from '../components/ui/Skeleton'
import { usePageTitle } from '../hooks/usePageTitle'

const STAT_LABELS = ['Levels', 'Players', 'Records', 'Total attempts'] as const

const EXPLORE_LINKS = [
  {
    to: '/list',
    title: 'The List',
    description: "Every level we've beaten, ranked from hardest down.",
  },
  {
    to: '/players',
    title: 'Players',
    description: 'Who has beaten what, and who leads on points.',
  },
  {
    to: '/recent',
    title: 'Recent changes',
    description: 'New completions, new levels and ranking moves.',
  },
] as const

export function HomePage() {
  usePageTitle()

  return (
    <PageShell>
      <section
        aria-labelledby="home-title"
        className="grid animate-fade-in items-center gap-10 pt-4 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16"
      >
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
            Geometry Dash · Friend group list
          </p>
          <h1
            id="home-title"
            className="mt-3 text-4xl leading-tight font-bold text-text sm:text-6xl"
          >
            Qwerty <span className="text-accent">Crate</span>
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
        </div>

        <PodiumPreview />
      </section>

      <section aria-labelledby="home-stats-title" className="mt-12 sm:mt-16">
        <h2 id="home-stats-title" className="sr-only">
          Site totals
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {STAT_LABELS.map((label) => (
            <Card key={label} padding="sm" className="sm:p-5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2 font-mono text-3xl font-semibold text-text tabular-nums">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not available yet</span>
              </dd>
            </Card>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <IconInfo className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>Live numbers appear here once the database is connected.</span>
        </p>
      </section>

      <section aria-labelledby="home-explore-title" className="mt-12 sm:mt-16">
        <h2 id="home-explore-title" className="text-xl font-semibold text-text sm:text-2xl">
          Explore
        </h2>
        <ul className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-3">
          {EXPLORE_LINKS.map((item) => (
            <Card as="li" key={item.to} interactive className="group relative">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-text">
                  <Link to={item.to} className={STRETCHED_LINK}>
                    {item.title}
                  </Link>
                </h3>
                <IconArrowRight className="mt-1 shrink-0 text-muted transition-colors group-hover:text-accent" />
              </div>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </Card>
          ))}
        </ul>
      </section>
    </PageShell>
  )
}

/** Decorative preview of how the top of the list will look (desktop only). */
function PodiumPreview() {
  return (
    <div aria-hidden="true" className="hidden lg:block">
      <Card padding="none" className="overflow-hidden shadow-lg shadow-black/20">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-mono text-xs tracking-widest text-muted uppercase">
            Top of the list
          </span>
          <span className="size-2 rounded-full bg-accent" />
        </div>
        <ol className="divide-y divide-border">
          {[1, 2, 3].map((rank) => (
            <li key={rank} className="flex items-center gap-4 px-5 py-4">
              <span className="w-10 shrink-0">
                <RankNumber rank={rank} />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
              <Skeleton className="h-6 w-12" rounded="full" />
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
