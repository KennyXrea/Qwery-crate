import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { IconArrowRight } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'

export function RecentPage() {
  usePageTitle('Recent changes')

  return (
    <PageShell
      eyebrow="Activity"
      title="Recent changes"
      description="New completions, new levels and ranking moves, newest first."
    >
      <EmptyState
        title="Recent changes are coming soon"
        description="A day-by-day timeline of who beat what, which levels were added and how the ranking moved will appear here once the database is connected."
        action={
          <ButtonLink to="/list" variant="secondary" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        }
      />
    </PageShell>
  )
}
