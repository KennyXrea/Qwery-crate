import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { STAT_GRID_COLUMNS } from './shared-visuals'
import type { StatGridColumns } from './shared-visuals'

type StatGridProps = {
  /** StatTile elements. */
  children: ReactNode
  /** Columns on wide screens (phones always show 2). Default 4. */
  columns?: StatGridColumns
  /** Names the list for screen readers, e.g. "Level stats". */
  label?: string
  className?: string
}

/** A responsive grid of StatTiles (a <dl>: each tile is a label + value pair). */
export function StatGrid({ children, columns = 4, label, className }: StatGridProps) {
  return (
    <dl
      aria-label={label}
      className={cn('grid gap-3 sm:gap-4', STAT_GRID_COLUMNS[columns], className)}
    >
      {children}
    </dl>
  )
}
