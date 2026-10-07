import { Spinner } from '../components/ui/Spinner'
import { cn } from '../lib/cn'

type PageLoaderProps = {
  /** Fill the whole screen (for pages that render outside the main site layout). */
  fullScreen?: boolean
  className?: string
}

/** Shown while a lazily loaded page's code is downloading. */
export function PageLoader({ fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'page-container flex items-center justify-center py-16',
        fullScreen ? 'min-h-dvh' : 'min-h-[50vh]',
        className,
      )}
    >
      <div className="flex animate-fade-in flex-col items-center gap-3 text-muted">
        <Spinner size="lg" label="Loading page" />
        <p aria-hidden="true" className="text-sm">
          Loading…
        </p>
      </div>
    </div>
  )
}
