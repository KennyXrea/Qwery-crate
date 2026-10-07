import { PageShell } from '../components/layout/PageShell'
import { EmptyState } from '../components/ui/EmptyState'
import { usePageTitle } from '../hooks/usePageTitle'

export function StatsPage() {
  usePageTitle('Stats')

  return (
    <PageShell
      eyebrow="By the numbers"
      title="Stats"
      description="Totals and trends across the whole list."
    >
      <EmptyState
        title="Stats are coming soon"
        description="Totals, how the list splits by difficulty, completions per month, the most-enjoyed levels and the most attempts will appear here once there's data to count."
      />
    </PageShell>
  )
}
