import { useLocation } from 'react-router'
import { cn } from '../../lib/cn'
import { ButtonLink } from '../ui/ButtonLink'
import { IconChevronLeft, IconHome } from '../ui/icons'

/**
 * "Level not found": shown at /level/<slug> when no level has that slug (renamed, removed, or a
 * typo). Looks like the site's 404 page, with the way back to the list first.
 */
export function LevelNotFound({ className }: { className?: string }) {
  const { pathname } = useLocation()

  return (
    <div
      className={cn(
        'mx-auto flex max-w-xl animate-fade-in flex-col items-center py-10 text-center sm:py-16',
        className,
      )}
    >
      <p
        aria-hidden="true"
        className="bg-linear-to-b from-muted/60 to-muted/5 bg-clip-text font-display text-8xl leading-none font-bold tracking-tighter text-transparent select-none sm:text-9xl"
      >
        404
      </p>

      <h1 className="mt-4 text-3xl font-bold text-text sm:text-4xl">Level not found</h1>
      <p className="mt-3 max-w-md text-muted">
        No level on the list has this address. It may have been renamed or removed, or the link has
        a typo.
      </p>

      <div className="mt-6 flex w-full max-w-full flex-col items-center gap-2">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">You tried</span>
        <code className="max-w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm break-all text-text">
          {pathname}
        </code>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink to="/list" leftIcon={<IconChevronLeft />} className="w-full sm:w-auto">
          Back to the list
        </ButtonLink>
        <ButtonLink to="/" variant="secondary" leftIcon={<IconHome />} className="w-full sm:w-auto">
          Go home
        </ButtonLink>
      </div>
    </div>
  )
}
