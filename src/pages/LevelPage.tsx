import { useParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { ButtonLink } from '../components/ui/ButtonLink'
import { EmptyState } from '../components/ui/EmptyState'
import { IconArrowRight, IconChevronLeft } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'
import { nameFromSlug } from './page-utils'

export function LevelPage() {
  const { slug = '' } = useParams()
  const name = nameFromSlug(slug) || 'Level'

  usePageTitle(name)

  return (
    <PageShell
      eyebrow="Level"
      title={name}
      description={
        <>
          Placeholder page for the level{' '}
          <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] wrap-anywhere box-decoration-clone text-text">
            {slug}
          </code>
          .
        </>
      }
      actions={
        <ButtonLink to="/list" variant="secondary" leftIcon={<IconChevronLeft />}>
          Back to the list
        </ButtonLink>
      }
    >
      <EmptyState
        title="Level details are coming soon"
        description="The showcase video, the level's stats (GD level ID, difficulty, points and length), every record and its position history will appear here once the database is connected."
        action={
          <ButtonLink to="/list" variant="ghost" rightIcon={<IconArrowRight />}>
            Browse the list
          </ButtonLink>
        }
      />
    </PageShell>
  )
}
