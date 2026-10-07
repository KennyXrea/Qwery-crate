import { cn } from '../../lib/cn'

type SkeletonRounded = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const ROUNDED: Record<SkeletonRounded, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

/**
 * A pulsing placeholder block. Give it a size with className (e.g. "h-4 w-32").
 * It's hidden from screen readers — mark the loading region with `aria-busy` instead.
 */
export function Skeleton({
  className,
  rounded = 'md',
}: {
  className?: string
  rounded?: SkeletonRounded
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-shimmer bg-surface-2', ROUNDED[rounded], className)}
    />
  )
}

/** A few stacked text-line placeholders; the last line is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const count = Math.max(1, Math.floor(lines))

  return (
    <div aria-hidden="true" className={cn('space-y-2.5', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          rounded="full"
          className={cn('h-3', count > 1 && i === count - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  )
}
