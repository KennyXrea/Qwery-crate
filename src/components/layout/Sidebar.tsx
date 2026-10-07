import { useId } from 'react'
import type { ReactNode } from 'react'
import { Card } from '../ui/Card'

type SidebarProps = {
  children: ReactNode
  /** Accessible name of the `<aside>` landmark. */
  label?: string
}

/** Right-hand column of a page (stacks below the content on small screens; see PageShell). */
export function Sidebar({ children, label = 'Page sidebar' }: SidebarProps) {
  return (
    <aside aria-label={label} className="space-y-4">
      {children}
    </aside>
  )
}

type SidebarSectionProps = {
  title: string
  /** Small control shown at the right of the title, e.g. a "View all" link. */
  action?: ReactNode
  children: ReactNode
}

/** One titled card inside a Sidebar. */
export function SidebarSection({ title, action, children }: SidebarSectionProps) {
  const headingId = useId()

  return (
    <Card as="section" padding="sm" aria-labelledby={headingId} className="sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="min-w-0 text-base font-semibold text-text">
          {title}
        </h2>
        {action ? <div className="shrink-0 text-sm">{action}</div> : null}
      </div>
      <div className="text-sm text-muted">{children}</div>
    </Card>
  )
}
