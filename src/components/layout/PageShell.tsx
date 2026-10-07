import { isValidElement } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Sidebar } from './Sidebar'

type PageShellProps = {
  /** Page heading, rendered as the page's only `<h1>`. */
  title?: ReactNode
  /** Small label above the title. */
  eyebrow?: ReactNode
  description?: ReactNode
  /** Buttons/links next to the title (right-aligned on wider screens, wrapping below on phones). */
  actions?: ReactNode
  /** Right column on large screens, stacked below the content on smaller ones. */
  sidebar?: ReactNode
  children: ReactNode
  className?: string
}

/** Standard page frame: width, spacing, the page header and the optional sidebar layout. */
export function PageShell({
  title,
  eyebrow,
  description,
  actions,
  sidebar,
  children,
  className,
}: PageShellProps) {
  const hasHeader = Boolean(title || eyebrow || description || actions)

  return (
    <div className={cn('page-container py-8 sm:py-10', className)}>
      {hasHeader && (
        // A <div>, not <header>: some tools and older screen readers announce every <header>
        // as a second "banner" landmark next to the site header.
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="text-3xl font-bold wrap-break-word text-text sm:text-4xl">{title}</h1>
            ) : null}
            {description ? (
              typeof description === 'string' ? (
                <p className="max-w-2xl text-muted">{description}</p>
              ) : (
                <div className="max-w-2xl text-muted">{description}</div>
              )
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      )}

      {sidebar ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="min-w-0">{children}</div>
          {isValidElement(sidebar) && sidebar.type === Sidebar ? (
            sidebar
          ) : (
            <Sidebar>{sidebar}</Sidebar>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
