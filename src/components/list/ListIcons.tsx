import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/*
 * Icons only the list page uses (same 24 × 24 stroke style as components/ui/icons.tsx).
 * They are decorative: the button or label next to them carries the words.
 */

type ListIconProps = { className?: string }

function ListIcon({ className, children }: ListIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-5 shrink-0', className)}
    >
      {children}
    </svg>
  )
}

/** Card view: picture blocks with lines of text beside them. */
export function IconCards({ className }: ListIconProps) {
  return (
    <ListIcon className={className}>
      <rect x="3" y="4" width="7" height="6" rx="1.5" />
      <rect x="3" y="14" width="7" height="6" rx="1.5" />
      <path d="M14 6h7" />
      <path d="M14 9h4" />
      <path d="M14 16h7" />
      <path d="M14 19h4" />
    </ListIcon>
  )
}

/** Table view: a grid of rows. */
export function IconTable({ className }: ListIconProps) {
  return (
    <ListIcon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M3 14.75h18" />
      <path d="M9 4v16" />
    </ListIcon>
  )
}

/** Filters: three sliders. */
export function IconFilter({ className }: ListIconProps) {
  return (
    <ListIcon className={className}>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 12h3" />
      <path d="M11 12h9" />
      <circle cx="9" cy="12" r="2" />
      <path d="M4 18h12" />
      <circle cx="18" cy="18" r="2" />
    </ListIcon>
  )
}
