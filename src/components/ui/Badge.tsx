import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'gold' | 'silver' | 'bronze'
type BadgeSize = 'sm' | 'md'

type BadgeProps = {
  tone?: BadgeTone
  size?: BadgeSize
  /** A small leading icon (decorative). */
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-2 text-muted',
  accent: 'border-accent/30 bg-accent/10 text-accent-soft',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  gold: 'border-gold/30 bg-gold/10 text-gold',
  silver: 'border-silver/30 bg-silver/10 text-silver',
  bronze: 'border-bronze/30 bg-bronze/10 text-bronze',
}

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs [&_svg]:size-3.5',
  md: 'px-2.5 py-1 text-sm [&_svg]:size-4',
}

/** A small rounded label, e.g. a difficulty or a status. */
export function Badge({ tone = 'neutral', size = 'sm', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}
