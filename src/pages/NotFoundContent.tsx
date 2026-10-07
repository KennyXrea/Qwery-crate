import { useLocation } from 'react-router'
import { ButtonLink } from '../components/ui/ButtonLink'
import { IconArrowRight, IconHome } from '../components/ui/icons'
import { cn } from '../lib/cn'

/**
 * The body of the "Page not found" screen. Shared by NotFoundPage (inside the site
 * layout) and RouteErrorPage (which may render without the layout).
 */
export function NotFoundContent({ className }: { className?: string }) {
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

      <h1 className="mt-4 text-3xl font-bold text-text sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-muted">
        There's nothing at this address. The page may have been moved or renamed, or the link has a
        typo.
      </p>

      <div className="mt-6 flex w-full max-w-full flex-col items-center gap-2">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">You tried</span>
        <code className="max-w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm break-all text-text">
          {pathname}
        </code>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink to="/" leftIcon={<IconHome />} className="w-full sm:w-auto">
          Go home
        </ButtonLink>
        <ButtonLink
          to="/list"
          variant="secondary"
          rightIcon={<IconArrowRight />}
          className="w-full sm:w-auto"
        >
          Browse the list
        </ButtonLink>
      </div>
    </div>
  )
}
