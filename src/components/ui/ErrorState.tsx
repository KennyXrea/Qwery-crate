import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { IconAlert } from './icons'

type ErrorStateProps = {
  title?: string
  message?: ReactNode
  /** Shows a "Try again" button when given. */
  onRetry?: () => void
  /** Puts the "Try again" button in its loading state. */
  retrying?: boolean
  /** Heading element for the title, so it fits the page outline. Defaults to `h2`. */
  titleAs?: 'h2' | 'h3' | 'p'
  /** `sm` is a compact version for small boxes (sidebar cards, one section of a page). */
  size?: 'md' | 'sm'
  className?: string
}

/** A friendly, announced error box with an optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying = false,
  titleAs: Title = 'h2',
  size = 'md',
  className,
}: ErrorStateProps) {
  const small = size === 'sm'

  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-danger/30 bg-danger/5 text-center',
        small ? 'px-4 py-6' : 'px-6 py-10 sm:py-12',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'mx-auto flex items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger',
          small ? 'size-10' : 'size-12',
        )}
      >
        <IconAlert className={small ? 'size-5' : 'size-6'} />
      </div>
      <Title
        className={cn(
          'font-display font-semibold text-text',
          small ? 'mt-3 text-base' : 'mt-4 text-lg',
        )}
      >
        {title}
      </Title>
      {message ? <div className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</div> : null}
      {onRetry ? (
        <div className={cn('flex justify-center', small ? 'mt-4' : 'mt-6')}>
          <Button
            variant="secondary"
            size={small ? 'sm' : 'md'}
            onClick={onRetry}
            loading={retrying}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
