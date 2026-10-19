import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { STAT_TILE, STAT_VALUE_SIZES } from './shared-visuals'
import type { StatTileSize } from './shared-visuals'

type StatTileProps = {
  label: ReactNode
  /** The number or text. Pass EMPTY_VALUE ("—") from lib/format when it's unknown. */
  value: ReactNode
  /** Small text under the value, e.g. "of 12 levels". */
  hint?: ReactNode
  /** A small decorative icon before the label. */
  icon?: ReactNode
  /** A control next to the value, e.g. a copy button. */
  action?: ReactNode
  /** Monospaced digits for the value (default). Turn off for names, badges and links. */
  mono?: boolean
  /** 'lg' for headline numbers (home page totals). Default 'md'. */
  size?: StatTileSize
  className?: string
}

/**
 * One labelled number in a StatGrid ("Points · 250.00"). It renders a <dt>/<dd> pair, so it
 * must sit inside a StatGrid (a <dl>).
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  action,
  mono = true,
  size = 'md',
  className,
}: StatTileProps) {
  return (
    <div className={cn(STAT_TILE, className)}>
      <dt className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium tracking-widest text-muted uppercase [&_svg]:size-3.5">
        {icon ? (
          <span aria-hidden="true" className="inline-flex text-accent">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            'min-w-0 font-semibold break-words text-text',
            mono && 'font-mono tabular-nums',
            STAT_VALUE_SIZES[size],
          )}
        >
          {value}
        </span>
        {action}
      </dd>
      {hint ? <dd className="mt-1 text-xs text-muted">{hint}</dd> : null}
    </div>
  )
}
