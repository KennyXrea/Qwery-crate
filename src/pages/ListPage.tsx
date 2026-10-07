import { Link } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { SidebarSection } from '../components/layout/Sidebar'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { STRETCHED_LINK } from '../components/ui/card-link'
import { IconArrowRight, IconInfo } from '../components/ui/icons'
import { RankNumber } from '../components/ui/RankNumber'
import { Skeleton } from '../components/ui/Skeleton'
import { cn } from '../lib/cn'
import { usePageTitle } from '../hooks/usePageTitle'

const SECTIONS = [
  { label: 'Main', range: '#1–25', current: true },
  { label: 'Extended', range: '#26–50', current: false },
  { label: 'Legacy', range: '#51+', current: false },
] as const

const SAMPLE_RANKS = [1, 2, 3, 4] as const

export function ListPage() {
  usePageTitle('The List')

  return (
    <PageShell
      eyebrow="Ranked by us"
      title="The List"
      description="Every level our group has beaten, ordered from hardest to easiest. Main and Extended levels earn points; Legacy levels are kept for history."
      sidebar={<ListSidebar />}
    >
      <div className="space-y-6">
        <SectionTabsPreview />

        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text"
        >
          <IconInfo className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>
            <span className="font-semibold">Preview.</span>{' '}
            <span className="text-muted">
              These are placeholder cards showing the layout. Real levels, thumbnails and stats
              appear here once the database is connected.
            </span>
          </p>
        </div>

        <ol aria-label="Placeholder levels" className="space-y-3">
          {SAMPLE_RANKS.map((rank) => (
            <PlaceholderLevelCard key={rank} rank={rank} />
          ))}
        </ol>
      </div>
    </PageShell>
  )
}

/** Looks like the Main / Extended / Legacy tabs; switching sections arrives with real data. */
function SectionTabsPreview() {
  return (
    <div>
      <ul
        aria-label="List sections"
        className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1"
      >
        {SECTIONS.map((section) => (
          <li
            key={section.label}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center sm:flex-row sm:gap-2',
              section.current ? 'bg-surface-2 text-text shadow-sm shadow-black/30' : 'text-muted',
            )}
          >
            <span className="text-sm font-semibold">
              {section.label}
              {section.current && <span className="sr-only"> (shown)</span>}
            </span>
            <span
              className={cn(
                'font-mono text-xs',
                section.current ? 'text-accent-soft' : 'text-muted',
              )}
            >
              {section.range}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Section switching turns on once levels are added.</p>
    </div>
  )
}

function PlaceholderLevelCard({ rank }: { rank: number }) {
  const slug = `sample-level-${rank}`

  return (
    <Card as="li" padding="sm" interactive className="group relative">
      <div className="flex gap-4 sm:gap-5">
        <div
          aria-hidden="true"
          // self-start: without it the row stretches the box to the text's height on phones,
          // which overrides aspect-video and squashes the 16:9 thumbnail.
          className="relative aspect-video w-28 shrink-0 self-start overflow-hidden rounded-xl bg-linear-to-br from-accent-strong/30 to-surface-2 ring-1 ring-white/5 ring-inset sm:w-48"
        >
          <span className="absolute right-2 bottom-1.5 font-mono text-[0.625rem] tracking-widest text-muted/80 uppercase">
            16:9
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <RankNumber rank={rank} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-text sm:text-lg">
                <Link to={`/level/${slug}`} className={STRETCHED_LINK}>
                  Sample Level {rank}
                </Link>
              </h2>
              <p className="truncate text-sm text-muted">by Creator Alpha</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            <Skeleton className="h-6 w-24" rounded="full" />
            <Skeleton className="h-6 w-16" rounded="full" />
            <Skeleton className="hidden h-6 w-20 sm:block" rounded="full" />
          </div>
        </div>

        <IconArrowRight className="hidden shrink-0 self-center text-muted transition-colors group-hover:text-accent sm:block" />
      </div>
    </Card>
  )
}

function ListSidebar() {
  return (
    <>
      <SidebarSection title="About the list">
        <p className="text-sm text-muted">
          Qwerty Crate ranks the hardest Geometry Dash levels our friend group has beaten. We decide
          the order together, and every level's points come from its position.
        </p>
      </SidebarSection>

      <SidebarSection title="How points work">
        <p className="text-sm text-muted">
          Higher positions are worth more points. A player's score is the total of every level they
          have beaten.
        </p>
        <Link
          to="/about"
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-soft"
        >
          Read how points work
          <IconArrowRight className="size-4" />
        </Link>
      </SidebarSection>

      <SidebarSection title="Top players" action={<Badge>Soon</Badge>}>
        <ol aria-label="Top players placeholder" className="space-y-3">
          {[1, 2, 3].map((rank) => (
            <li key={rank} className="flex items-center gap-3">
              <span className="w-8 shrink-0">
                <RankNumber rank={rank} size="sm" />
              </span>
              <Skeleton className="h-3 flex-1" />
              <span className="font-mono text-xs text-muted">
                <span aria-hidden="true">— pts</span>
                <span className="sr-only">No points yet</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">The leaderboard fills in from real records.</p>
      </SidebarSection>

      <SidebarSection title="Latest records" action={<Badge>Soon</Badge>}>
        <ul aria-hidden="true" className="space-y-3">
          {[0, 1, 2].map((row) => (
            <li key={row} className="space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/3" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          New completions will show up here as they're added.
        </p>
      </SidebarSection>
    </>
  )
}
