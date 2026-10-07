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
  className?: string
}

/** A friendly, announced error box with an optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying = false,
  titleAs: Title = 'h2',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center sm:py-12',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="mx-auto flex size-12 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger"
      >
        <IconAlert className="size-6" />
      </div>
      <Title className="mt-4 font-display text-lg font-semibold text-text">{title}</Title>
      {message ? <div className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</div> : null}
      {onRetry ? (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onRetry} loading={retrying}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
