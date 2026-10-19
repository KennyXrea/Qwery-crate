import { cn } from '../../lib/cn'
import { EMPTY_VALUE, formatDate, formatNumber } from '../../lib/format'
import { safeExternalUrl } from '../../lib/url'
import type { Completion } from '../../types/models'
import { PlayerLink } from '../player/PlayerLink'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { ExternalLink } from '../ui/ExternalLink'
import { IconPlay, IconTrophy } from '../ui/icons'
import {
  RECORDS_BODY,
  RECORDS_CELL_LABEL,
  RECORDS_COLUMNS,
  RECORDS_HEAD,
  RECORDS_HEADER_CELL,
  RECORDS_ROW,
  RECORDS_TABLE,
  recordsCell,
} from './level-detail'

type RecordsTableProps = {
  /** The level's records in getLevelRecords() order (first victor first). Shown as given. */
  records: readonly Completion[]
  /** For the table caption: "Everyone who beat <level>". */
  levelName: string
  className?: string
}

/**
 * Everyone who beat a level: Player | Date | Attempts | Enjoyment | Video | Notes, in the order
 * given (first victor first, marked with a gold badge). A table from `md` up; on phones each
 * row turns into a small card (see RECORDS_* in level-detail.ts), so nothing scrolls sideways.
 */
export function RecordsTable({ records, levelName, className }: RecordsTableProps) {
  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <table role="table" className={RECORDS_TABLE}>
        <caption className="sr-only">Everyone who beat {levelName}, first victor first</caption>
        <thead role="rowgroup" className={RECORDS_HEAD}>
          <tr role="row" className="border-b border-border bg-surface-2/50">
            {RECORDS_COLUMNS.map((column) => (
              <th
                key={column}
                role="columnheader"
                scope="col"
                className={cn(
                  RECORDS_HEADER_CELL,
                  (column === 'Attempts' || column === 'Enjoyment') && 'text-right',
                  column === 'Video' && 'text-center',
                )}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className={RECORDS_BODY}>
          {records.map((record) => (
            <RecordRow key={record.id} record={record} />
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function RecordRow({ record }: { record: Completion }) {
  const hasVideo = safeExternalUrl(record.video_url) !== null
  const notes = record.notes?.trim() || null

  return (
    <tr
      role="row"
      data-first-victor={record.is_first_victory ? 'true' : undefined}
      className={cn(RECORDS_ROW, record.is_first_victory && 'bg-gold/5')}
    >
      <td role="cell" className={cn(recordsCell(), 'col-span-3')}>
        <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 md:max-w-[17rem]">
          <PlayerLink
            player={{
              name: record.player_name,
              slug: record.player_slug,
              id: record.player_id,
              country_code: record.player_country_code,
            }}
            className="max-w-full"
          />
          {record.is_first_victory ? (
            <Badge tone="gold" icon={<IconTrophy />}>
              First victor
            </Badge>
          ) : null}
        </div>
      </td>

      <td role="cell" className={cn(recordsCell(), 'md:whitespace-nowrap')}>
        <CellLabel>Date</CellLabel>
        {record.date_beaten ? (
          <time dateTime={record.date_beaten} className="text-text">
            {formatDate(record.date_beaten)}
          </time>
        ) : (
          <Unknown label="Date unknown" />
        )}
      </td>

      <td role="cell" className={cn(recordsCell(), 'md:text-right md:whitespace-nowrap')}>
        <CellLabel>Attempts</CellLabel>
        {record.attempts === null ? (
          <Unknown label="Attempts unknown" />
        ) : (
          <span className="font-mono text-text tabular-nums">{formatNumber(record.attempts)}</span>
        )}
      </td>

      <td role="cell" className={cn(recordsCell(), 'md:text-right md:whitespace-nowrap')}>
        <CellLabel>Enjoyment</CellLabel>
        {record.enjoyment === null ? (
          <Unknown label="Not rated" />
        ) : (
          <span className="font-mono text-text tabular-nums">
            {formatNumber(record.enjoyment)}
            <span className="text-muted">
              <span aria-hidden="true">/10</span>
              <span className="sr-only"> out of 10</span>
            </span>
          </span>
        )}
      </td>

      {/* On phones an empty video / notes cell is left out instead of showing "—". */}
      <td role="cell" className={cn(recordsCell(hasVideo), 'col-span-3 md:text-center')}>
        <ExternalLink
          href={record.video_url}
          plain
          showIcon={false}
          fallback={<Unknown label="No video" />}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-white md:size-10 md:justify-center md:border-transparent md:bg-transparent md:px-0 md:text-accent md:hover:border-transparent md:hover:bg-surface-2 md:hover:text-accent-soft [&_svg]:size-5"
        >
          <IconPlay />
          <span className="md:sr-only">Watch video</span>{' '}
          <span className="sr-only">by {record.player_name}</span>
        </ExternalLink>
      </td>

      <td role="cell" className={cn(recordsCell(notes !== null), 'col-span-3 text-muted')}>
        <CellLabel>Notes</CellLabel>
        {notes ? (
          <p className="whitespace-pre-line wrap-anywhere md:max-w-72 md:min-w-40">{notes}</p>
        ) : (
          <Unknown label="No notes" />
        )}
      </td>
    </tr>
  )
}

/** The value's label in the phone layout (the column header names it from md up). */
function CellLabel({ children }: { children: string }) {
  return (
    <span aria-hidden="true" className={RECORDS_CELL_LABEL}>
      {children}
    </span>
  )
}

/** "—" for a missing value, with words for screen readers. */
function Unknown({ label }: { label: string }) {
  return (
    <span className="text-muted">
      <span aria-hidden="true">{EMPTY_VALUE}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
