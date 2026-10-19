import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { formatDate, formatNumber, formatPoints } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Completion } from '../../types/models'
import { DifficultyBadge } from '../level/DifficultyBadge'
import { SectionBadge } from '../level/SectionBadge'
import { Badge } from '../ui/Badge'
import { ExternalLink } from '../ui/ExternalLink'
import { IconPlay, IconStar } from '../ui/icons'
import { INLINE_LINK } from '../ui/link-styles'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import { MissingValue } from './MissingValue'
import {
  CELL_LABEL,
  COMPLETION_COLUMNS,
  COMPLETION_ROW_GRID,
  NUMBER_VALUE,
  TABLE,
  TABLE_BODY,
  TABLE_FRAME,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TD,
  TD_X,
  TH,
} from './player-page-visuals'
import type { CompletionSort } from './player-page-visuals'

/** The completion fields one row shows (any `Completion` has them). */
export type CompletionsListItem = Pick<
  Completion,
  | 'id'
  | 'level_name'
  | 'level_slug'
  | 'level_position'
  | 'level_section'
  | 'level_points'
  | 'level_difficulty'
  | 'attempts'
  | 'enjoyment'
  | 'date_beaten'
  | 'video_url'
  | 'is_first_victory'
>

type CompletionsListProps = {
  completions: CompletionsListItem[]
  /** The order the rows are in; marks the matching column header as sorted. */
  sort: CompletionSort
  /** Read by screen readers as the table's name, e.g. "Levels Player Alpha has beaten". */
  caption: string
  className?: string
}

function CompletionsHead({ sort }: { sort?: CompletionSort }) {
  return (
    <thead role="rowgroup" className={TABLE_HEAD}>
      <tr role="row" className={TABLE_HEAD_ROW}>
        <th
          role="columnheader"
          scope="col"
          aria-sort={sort === 'position' ? 'ascending' : undefined}
          className={cn(TH, COMPLETION_COLUMNS.rank)}
        >
          Rank
        </th>
        <th role="columnheader" scope="col" className={cn(TH, COMPLETION_COLUMNS.level)}>
          Level
        </th>
        <th role="columnheader" scope="col" className={cn(TH, COMPLETION_COLUMNS.points)}>
          Points
        </th>
        <th role="columnheader" scope="col" className={cn(TH, COMPLETION_COLUMNS.attempts)}>
          Attempts
        </th>
        <th role="columnheader" scope="col" className={cn(TH, COMPLETION_COLUMNS.enjoyment)}>
          Enjoyment
        </th>
        <th
          role="columnheader"
          scope="col"
          aria-sort={sort === 'date' ? 'descending' : undefined}
          className={cn(TH, COMPLETION_COLUMNS.date)}
        >
          Date
        </th>
        <th role="columnheader" scope="col" className={cn(TH, COMPLETION_COLUMNS.video)}>
          Video
        </th>
      </tr>
    </thead>
  )
}

function CompletionRow({ completion }: { completion: CompletionsListItem }) {
  return (
    <tr
      role="row"
      data-first-victory={completion.is_first_victory ? 'true' : undefined}
      className={cn(TABLE_ROW, COMPLETION_ROW_GRID)}
    >
      <td role="cell" className={cn(TD, COMPLETION_COLUMNS.rank)}>
        <RankNumber rank={completion.level_position} size="sm" />
      </td>

      <th
        role="rowheader"
        scope="row"
        className={cn(TD, COMPLETION_COLUMNS.level, 'text-left font-normal')}
      >
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <Link
            to={levelPath(completion.level_slug)}
            className={cn(INLINE_LINK, 'text-base break-words')}
          >
            {completion.level_name}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            <DifficultyBadge difficulty={completion.level_difficulty} />
            {completion.is_first_victory ? (
              <Badge tone="gold" icon={<IconStar />}>
                First victor
              </Badge>
            ) : null}
            {completion.level_section === 'legacy' ? <SectionBadge section="legacy" /> : null}
          </div>
        </div>
      </th>

      <td role="cell" className={cn(TD, COMPLETION_COLUMNS.points)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Points
        </span>
        <span className={cn(NUMBER_VALUE, 'font-semibold')}>
          {formatPoints(completion.level_points)}
        </span>
      </td>

      <td role="cell" className={cn(TD, COMPLETION_COLUMNS.attempts)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Attempts
        </span>
        {completion.attempts === null ? (
          <MissingValue label="Not recorded" />
        ) : (
          <span className={NUMBER_VALUE}>{formatNumber(completion.attempts)}</span>
        )}
      </td>

      <td role="cell" className={cn(TD, COMPLETION_COLUMNS.enjoyment)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Enjoyment
        </span>
        {completion.enjoyment === null ? (
          <MissingValue label="Not rated" />
        ) : (
          <span className={NUMBER_VALUE}>
            {formatNumber(completion.enjoyment)}
            <span className="text-xs text-muted">
              <span aria-hidden="true">/10</span>
              <span className="sr-only"> out of 10</span>
            </span>
          </span>
        )}
      </td>

      <td role="cell" className={cn(TD, COMPLETION_COLUMNS.date)}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Date
        </span>
        {/* As tall as the video link next to it on phones, so the two line up. */}
        <span className="max-md:flex max-md:min-h-10 max-md:items-center">
          {completion.date_beaten === null ? (
            <MissingValue label="Unknown date" />
          ) : (
            <time dateTime={completion.date_beaten} className="text-text">
              {formatDate(completion.date_beaten)}
            </time>
          )}
        </span>
      </td>

      <td role="cell" className={cn(TD_X, COMPLETION_COLUMNS.video, 'md:py-1')}>
        <span aria-hidden="true" className={CELL_LABEL}>
          Video
        </span>
        <ExternalLink
          href={completion.video_url}
          fallback={<MissingValue label="No video" className="inline-flex min-h-10 items-center" />}
          showIcon={false}
          className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap"
        >
          <IconPlay className="size-4" />
          <span aria-hidden="true">Video</span>
          <span className="sr-only">Video of {completion.level_name}</span>
        </ExternalLink>
      </td>
    </tr>
  )
}

/**
 * The levels a player has beaten: Rank | Level | Points | Attempts | Enjoyment | Date | Video.
 * Each level links to its page and shows its difficulty, plus "First victor" when this player
 * beat it first. A real table from `md` up; on phones each level becomes a small stacked card.
 * Video links go through ExternalLink (safe http(s) links only, new tab).
 */
export function CompletionsList({ completions, sort, caption, className }: CompletionsListProps) {
  return (
    <div className={cn(TABLE_FRAME, className)}>
      <table role="table" className={TABLE}>
        <caption className="sr-only">{caption}</caption>
        <CompletionsHead sort={sort} />
        <tbody role="rowgroup" className={TABLE_BODY}>
          {completions.map((completion) => (
            <CompletionRow key={completion.id} completion={completion} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A CompletionsList-shaped loading placeholder (hidden from screen readers). */
export function CompletionsListSkeleton({
  rows = 4,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div aria-hidden="true" className={cn(TABLE_FRAME, className)}>
      <table className={TABLE}>
        <CompletionsHead />
        <tbody className={TABLE_BODY}>
          {Array.from({ length: Math.max(1, Math.floor(rows)) }, (_, i) => (
            <tr key={i} className={cn(TABLE_ROW, COMPLETION_ROW_GRID)}>
              <td className={cn(TD, COMPLETION_COLUMNS.rank)}>
                <Skeleton className="h-5 w-8" />
              </td>
              <td className={cn(TD, COMPLETION_COLUMNS.level)}>
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton rounded="full" className="mt-2 h-5 w-28" />
              </td>
              {(['points', 'attempts', 'enjoyment'] as const).map((column) => (
                <td key={column} className={cn(TD, COMPLETION_COLUMNS[column])}>
                  <Skeleton className="mb-1.5 h-3 w-14 md:hidden" />
                  <Skeleton className="h-4 w-14 md:ml-auto" />
                </td>
              ))}
              <td className={cn(TD, COMPLETION_COLUMNS.date)}>
                <Skeleton className="mb-1.5 h-3 w-10 md:hidden" />
                <Skeleton className="h-4 w-24" />
              </td>
              <td className={cn(TD, COMPLETION_COLUMNS.video)}>
                <Skeleton className="mb-1.5 h-3 w-10 md:hidden" />
                <Skeleton className="h-4 w-14" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
