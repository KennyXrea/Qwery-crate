import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type IconProps = {
  className?: string
  /** Accessible name. Leave it out for decorative icons (most of them) — they're hidden from screen readers. */
  title?: string
}

export type { IconProps }

/**
 * A size class from the caller (size-*, w-*, h-*) replaces the default `size-5`.
 * There's no tailwind-merge, so we drop our default instead of letting two sizes fight.
 * Responsive ones like `sm:size-6` don't count: they layer on top of the default.
 */
const HAS_SIZE_CLASS = /(?:^|\s)(?:size|w|h)-/

function SvgIcon({ className, title, children }: IconProps & { children: ReactNode }) {
  const titleId = useId()
  const hasSize = className !== undefined && HAS_SIZE_CLASS.test(className)

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
      role={title ? 'img' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      className={cn(!hasSize && 'size-5', 'shrink-0', className)}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {children}
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </SvgIcon>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </SvgIcon>
  )
}

export function IconClose(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  )
}

export function IconChevronLeft(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  )
}

/** Warning triangle — used for errors and problems. */
export function IconAlert(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </SvgIcon>
  )
}

export function IconInfo(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4.5" />
      <path d="M12 8h.01" />
    </SvgIcon>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </SvgIcon>
  )
}

/** "Opens in a new tab / another site". */
export function IconExternal(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </SvgIcon>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </SvgIcon>
  )
}

export function IconArrowUp(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </SvgIcon>
  )
}

export function IconArrowDown(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </SvgIcon>
  )
}

export function IconHome(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
    </SvgIcon>
  )
}
