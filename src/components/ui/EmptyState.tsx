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
  /** `sm` is a compact version for small boxes (sidebar cards, one section of a page). */
  size?: 'md' | 'sm'
  className?: string
}

/** "Nothing here yet" — a calm, centered message with an optional next step. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  titleAs: Title = 'h2',
  size = 'md',
  className,
}: EmptyStateProps) {
  const small = size === 'sm'

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-surface/40 text-center',
        small ? 'px-4 py-6' : 'px-6 py-10 sm:py-14',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'mx-auto flex items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent',
          small ? 'size-10 [&_svg]:size-5' : 'size-12 [&_svg]:size-6',
        )}
      >
        {icon ?? <IconInbox />}
      </div>
      <Title
        className={cn(
          'font-display font-semibold text-text',
          small ? 'mt-3 text-base' : 'mt-4 text-lg',
        )}
      >
        {title}
      </Title>
      {description ? (
        <div className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</div>
      ) : null}
      {action ? (
        <div className={cn('flex flex-wrap justify-center gap-3', small ? 'mt-4' : 'mt-6')}>
          {action}
        </div>
      ) : null}
    </div>
  )
}
