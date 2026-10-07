import { useId } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'

/**
 * The blue "QC" monogram square (same drawing as public/favicon.svg). Decorative: always pair
 * it with visible text or an accessible name. Size it with a class, e.g. `size-9`.
 */
export function LogoMark({ className }: { className?: string }) {
  // A unique gradient id per instance, so several logos on one page never clash.
  const gradientId = `${useId()}qc-gradient`

  return (
    <svg
      viewBox="0 0 32 32"
      width={32}
      height={32}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#2f6fed" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`url(#${gradientId})`} />
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="10.9" cy="16" r="4.5" />
        <path d="M14.1 19.2 16.2 21.6" />
        <path d="M25.6 12.8A4.5 4.5 0 1 0 25.6 19.2" />
      </g>
    </svg>
  )
}

/** Monogram + "QWERTY CRATE" wordmark, linking to the home page. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Qwerty Crate — home"
      className={cn(
        'group inline-flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg',
        className,
      )}
    >
      <LogoMark className="size-9 transition-transform duration-200 group-hover:-rotate-6" />
      <span className="truncate font-display text-base font-bold tracking-wide text-text sm:text-lg">
        QWERTY <span className="text-accent">CRATE</span>
      </span>
    </Link>
  )
}
