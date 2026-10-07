import { useParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { IconChevronLeft } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'
import { nameFromSlug } from './page-utils'

export function PlayerPage() {
  const { slug = '' } = useParams()
  const name = nameFromSlug(slug) || 'Player'

  usePageTitle(name)

  return (
    <PageShell
      eyebrow="Player"
      title={name}
      description={
        <>
          Placeholder page for the player{' '}
          <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] wrap-anywhere box-decoration-clone text-text">
            {slug}
          </code>
          .
        </>
      }
      actions={
        <ButtonLink to="/players" variant="secondary" leftIcon={<IconChevronLeft />}>
          All players
        </ButtonLink>
      }
    >
      <EmptyState
        title="Player profiles are coming soon"
        description="This player's rank, total points, every level they've beaten and a breakdown by difficulty will appear here once the database is connected."
      />
    </PageShell>
  )
}
