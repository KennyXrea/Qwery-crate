import { Link } from 'react-router'
import { Logo } from '../../components/layout/Logo'
import { PageShell } from '../../components/layout/PageShell'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconChevronLeft } from '../../components/ui/icons'
import { usePageTitle } from '../../hooks/usePageTitle'

/** Stand-in for the admin area, which gets its own layout (outside the public site). */
export function AdminPlaceholderPage() {
  usePageTitle('Admin dashboard')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden sm:inline-flex">
              <Badge tone="accent">Admin</Badge>
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            <IconChevronLeft className="size-4" />
            Back to site
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <PageShell
          eyebrow="Admin"
          title="Admin dashboard"
          description="The admin dashboard arrives in a later phase."
        >
          <EmptyState
            title="Nothing to manage yet"
            description="This is where admins will add and edit levels, reorder the ranking, manage players and records, change the points settings and download backups."
          />
        </PageShell>
      </main>
    </div>
  )
}
