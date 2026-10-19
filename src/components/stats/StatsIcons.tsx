import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type StatsIconProps = { className?: string }

/** Decorative 24×24 outline icon in the same style as components/ui/icons. */
function OutlineIcon({ className, children }: StatsIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      {children}
    </svg>
  )
}

/** Levels on the list (a stack). */
export function IconLayers(props: StatsIconProps) {
  return (
    <OutlineIcon {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </OutlineIcon>
  )
}

/** Attempts (going round again). */
export function IconRepeat(props: StatsIconProps) {
  return (
    <OutlineIcon {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" />
      <path d="M4 20v-4.5h4.5" />
    </OutlineIcon>
  )
}

/** Charts and stats (columns). */
export function IconChart(props: StatsIconProps) {
  return (
    <OutlineIcon {...props}>
      <path d="M4 20h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V6" />
      <path d="M17 16v-8" />
    </OutlineIcon>
  )
}
