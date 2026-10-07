import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { IconArrowRight } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'

export function PlayersPage() {
  usePageTitle('Players')

  return (
    <PageShell
      eyebrow="Leaderboard"
      title="Players"
      description="Everyone in the group, ranked by the total points of the levels they've beaten."
    >
      <EmptyState
        title="The leaderboard is coming soon"
        description="Each player's rank, total points, number of completions and hardest level will appear here once the database is connected."
        action={
          <ButtonLink to="/list" variant="secondary" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        }
      />
    </PageShell>
  )
}
