import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'

type StatsSectionProps = {
  title: string
  /** One short line under the title: what the numbers mean. */
  description?: ReactNode
  /** A small control at the right of the title, e.g. a "View all" link. */
  action?: ReactNode
  /** Marks the content as loading for screen readers (put skeletons inside). */
  busy?: boolean
  children: ReactNode
  className?: string
}

/** One titled card on the Stats page (a region named by its <h2>). */
export function StatsSection({
  title,
  description,
  action,
  busy = false,
  children,
  className,
}: StatsSectionProps) {
  const headingId = useId()

  return (
    <Card
      as="section"
      padding="sm"
      aria-labelledby={headingId}
      className={cn('flex min-w-0 flex-col sm:p-6', className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold text-text">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 text-sm">{action}</div> : null}
      </div>
      <div aria-busy={busy || undefined} className="min-w-0 flex-1">
        {children}
      </div>
    </Card>
  )
}
