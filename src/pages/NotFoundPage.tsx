import { PageShell } from '../components/layout/PageShell'
import { usePageTitle } from '../hooks/usePageTitle'
import { NotFoundContent } from './NotFoundContent'

export function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <PageShell>
      <NotFoundContent />
    </PageShell>
  )
}
