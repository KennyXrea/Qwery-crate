import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconInbox } from './icons'

type EmptyStateProps = {
  title: string
  description?: ReactNode
  /** Defaults to an inbox icon. */
  icon?: ReactNode
  /** Usually a Button or ButtonLink. */
  action?: ReactNode
  /** Heading element for the title, so it fits the page outline. Defaults to `h2`. */
  titleAs?: 'h2' | 'h3' | 'p'
  className?: string
}

/** "Nothing here yet" — a calm, centered message with an optional next step. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  titleAs: Title = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center sm:py-14',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent [&_svg]:size-6"
      >
        {icon ?? <IconInbox />}
      </div>
      <Title className="mt-4 font-display text-lg font-semibold text-text">{title}</Title>
      {description ? (
        <div className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}
