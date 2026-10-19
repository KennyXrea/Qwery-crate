import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { EMPTY_VALUE, formatAverage, formatNumber, formatPoints } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Level } from '../../types/models'
import { DifficultyBadge } from '../level/DifficultyBadge'
import { PlayerLink } from '../player/PlayerLink'
import { IconStar } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import {
  LEVEL_TABLE,
  LEVEL_TABLE_BODY,
  LEVEL_TABLE_CELL,
  LEVEL_TABLE_COLUMNS as COL,
  LEVEL_TABLE_CONTAINER,
  LEVEL_TABLE_FRAME,
  LEVEL_TABLE_HEAD,
  LEVEL_TABLE_HEAD_CELL,
  LEVEL_TABLE_ROW,
  SKELETON_TABLE_ROWS,
  STACKED_ONLY,
  TABLE_ROW_LINK,
} from './list-visuals'

/** The level fields a table row shows (any `Level` has them). */
type LevelTableLevel = Pick<
  Level,
  | 'id'
  | 'name'
  | 'slug'
  | 'position'
  | 'creator'
  | 'difficulty'
  | 'points'
  | 'victor_count'
  | 'avg_enjoyment'
  | 'first_victor_name'
  | 'first_victor_slug'
>

type LevelTableProps = {
  levels: readonly LevelTableLevel[]
  /** Read by screen readers before the table, e.g. "Main list, page 1". */
  caption: string
  className?: string
}

/**
 * The compact table view: Rank | Level | Difficulty | Player | Points | Enjoyment.
 * Player is the first victor (linked) plus "+N" for everyone else who beat it. Each whole row
 * opens its level. When the table's box is narrower than 48rem the rows stack (see
 * list-visuals.ts), so it never scrolls sideways.
 */
export function LevelTable({ levels, caption, className }: LevelTableProps) {
  return (
    <div className={cn(LEVEL_TABLE_CONTAINER, className)}>
      <div className={LEVEL_TABLE_FRAME}>
        <table role="table" className={LEVEL_TABLE}>
          <caption className="sr-only">{caption}</caption>
          <LevelTableHead />
          <tbody role="rowgroup" className={LEVEL_TABLE_BODY}>
            {levels.map((level) => (
              <LevelTableRow key={level.id} level={level} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LevelTableHead() {
  return (
    <thead role="rowgroup" className={LEVEL_TABLE_HEAD}>
      <tr role="row">
        <th role="columnheader" scope="col" className={cn(LEVEL_TABLE_HEAD_CELL, COL.rank.head)}>
          Rank
        </th>
        <th role="columnheader" scope="col" className={cn(LEVEL_TABLE_HEAD_CELL, COL.level.head)}>
          Level
        </th>
        <th
          role="columnheader"
          scope="col"
          className={cn(LEVEL_TABLE_HEAD_CELL, COL.difficulty.head)}
        >
          Difficulty
        </th>
        <th role="columnheader" scope="col" className={cn(LEVEL_TABLE_HEAD_CELL, COL.player.head)}>
          Player
        </th>
        <th role="columnheader" scope="col" className={cn(LEVEL_TABLE_HEAD_CELL, COL.points.head)}>
          Points
        </th>
        <th
          role="columnheader"
          scope="col"
          className={cn(LEVEL_TABLE_HEAD_CELL, COL.enjoyment.head)}
        >
          Enjoyment
        </th>
      </tr>
    </thead>
  )
}

function LevelTableRow({ level }: { level: LevelTableLevel }) {
  const others = Math.max(0, level.victor_count - 1)
  const firstVictor =
    level.first_victor_name && level.first_victor_slug
      ? { name: level.first_victor_name, slug: level.first_victor_slug }
      : null

  return (
    <tr role="row" className={LEVEL_TABLE_ROW}>
      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.rank.cell)}>
        <RankNumber rank={level.position} size="sm" />
      </td>

      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.level.cell, 'min-w-0')}>
        <Link
          to={levelPath(level.slug)}
          className={cn(
            TABLE_ROW_LINK,
            'line-clamp-2 font-semibold text-text transition-colors hover:text-accent-soft',
          )}
        >
          {level.name}
        </Link>
        {level.creator ? (
          <p className="mt-0.5 truncate text-xs text-muted">by {level.creator}</p>
        ) : null}
      </td>

      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.difficulty.cell)}>
        <DifficultyBadge difficulty={level.difficulty} />
      </td>

      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.player.cell, 'min-w-0')}>
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={cn(STACKED_ONLY, 'shrink-0 text-xs text-muted')}>
            First victor
          </span>
          {firstVictor ? (
            <>
              <PlayerLink
                player={firstVictor}
                showAvatar={false}
                showFlag={false}
                className="relative z-10 min-w-0"
              />
              {others > 0 ? (
                <span
                  title={`${formatNumber(others)} more ${others === 1 ? 'victor' : 'victors'}`}
                  className="shrink-0 rounded-full border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted tabular-nums"
                >
                  <span aria-hidden="true">+{formatNumber(others)}</span>
                  <span className="sr-only">and {formatNumber(others)} more</span>
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted">
              <span aria-hidden="true">{EMPTY_VALUE}</span>
              <span className="sr-only">Nobody yet</span>
            </span>
          )}
        </div>
      </td>

      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.points.cell)}>
        <span className="font-mono font-semibold whitespace-nowrap text-text tabular-nums">
          {formatPoints(level.points)}
          <span
            aria-hidden="true"
            className={cn(STACKED_ONLY, 'font-sans text-xs font-normal text-muted')}
          >
            {' pts'}
          </span>
        </span>
      </td>

      <td role="cell" className={cn(LEVEL_TABLE_CELL, COL.enjoyment.cell)}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <IconStar className={cn(STACKED_ONLY, 'size-4 text-gold')} />
          {level.avg_enjoyment === null ? (
            <span className="text-muted">
              <span aria-hidden="true">{EMPTY_VALUE}</span>
              <span className="sr-only">Not rated yet</span>
            </span>
          ) : (
            <span className="font-mono text-text tabular-nums">
              {formatAverage(level.avg_enjoyment)}
              <span className="sr-only"> out of 10</span>
            </span>
          )}
        </span>
      </td>
    </tr>
  )
}

type LevelTableSkeletonProps = {
  rows?: number
  className?: string
}

/** Loading placeholder with exactly LevelTable's shape. Hidden from screen readers. */
export function LevelTableSkeleton({
  rows = SKELETON_TABLE_ROWS,
  className,
}: LevelTableSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn(LEVEL_TABLE_CONTAINER, className)}>
      <div className={LEVEL_TABLE_FRAME}>
        <table className={LEVEL_TABLE}>
          <LevelTableHead />
          <tbody className={LEVEL_TABLE_BODY}>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} className={LEVEL_TABLE_ROW}>
                <td className={cn(LEVEL_TABLE_CELL, COL.rank.cell)}>
                  <Skeleton className="h-5 w-8" />
                </td>
                <td className={cn(LEVEL_TABLE_CELL, COL.level.cell)}>
                  <Skeleton className="h-4 w-3/4 max-w-48" />
                  <Skeleton className="mt-1.5 h-3 w-1/3 max-w-24" />
                </td>
                <td className={cn(LEVEL_TABLE_CELL, COL.difficulty.cell)}>
                  <Skeleton rounded="full" className="h-6 w-32" />
                </td>
                <td className={cn(LEVEL_TABLE_CELL, COL.player.cell)}>
                  <div className="flex min-h-10 items-center">
                    <Skeleton className="h-4 w-28" />
                  </div>
                </td>
                <td className={cn(LEVEL_TABLE_CELL, COL.points.cell)}>
                  <Skeleton className="ml-auto h-4 w-14" />
                </td>
                <td className={cn(LEVEL_TABLE_CELL, COL.enjoyment.cell)}>
                  <Skeleton className="ml-auto h-4 w-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
