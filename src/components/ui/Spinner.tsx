import { cn } from '../../lib/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

type SpinnerProps = {
  size?: SpinnerSize
  /** Read out by screen readers (ignored when `decorative`). */
  label?: string
  className?: string
  /**
   * Hide it from screen readers and drop `role="status"` — for spinners inside something
   * that already announces it is busy (e.g. a loading Button). A decorative spinner takes
   * the surrounding text color, so it matches a button's label.
   */
  decorative?: boolean
}

const SIZES: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-10',
}

function SpinnerRing({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0 animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} opacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

/** A spinning ring. Standalone spinners are accent blue and announce `label` politely. */
export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
  decorative = false,
}: SpinnerProps) {
  if (decorative) {
    return <SpinnerRing className={cn(SIZES[size], className)} />
  }

  return (
    <span
      role="status"
      className={cn('inline-flex items-center justify-center text-accent', className)}
    >
      <SpinnerRing className={SIZES[size]} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
