/**
 * Helpers behind the level page's pieces (LevelHeader, LevelVideo, LevelStatGrid, RecordsTable,
 * PositionHistory, LevelNav). Kept out of the .tsx files so those only export components.
 */
import { safeExternalUrl } from '../../lib/url'
import { getYouTubeId } from '../../lib/youtube'
import type { Level, LevelSection, PositionHistoryEntry } from '../../types/models'

// ── Video ─────────────────────────────────────────────────────────────────────────────────────

/** The video a level page shows, and where it came from. */
export type LevelVideoPick =
  | { source: 'showcase'; url: string }
  | { source: 'first_victor'; url: string; playerName: string | null; playerSlug: string | null }

export type LevelVideoFields = Pick<
  Level,
  'showcase_video_url' | 'first_victor_video_url' | 'first_victor_name' | 'first_victor_slug'
>

/**
 * The level's showcase video, or else its first victor's video. Only safe http(s) links count
 * (a broken showcase link falls through to the first victor's video). Null when there's none.
 */
export function pickLevelVideo(level: LevelVideoFields): LevelVideoPick | null {
  const showcase = safeExternalUrl(level.showcase_video_url)
  if (showcase) return { source: 'showcase', url: showcase }
  const victor = safeExternalUrl(level.first_victor_video_url)
  if (victor) {
    return {
      source: 'first_victor',
      url: victor,
      playerName: level.first_victor_name,
      playerSlug: level.first_victor_slug,
    }
  }
  return null
}

/** True when the video plays on the page (a YouTube link); other links open in a new tab. */
export function isEmbeddableVideo(video: LevelVideoPick | null): boolean {
  return video !== null && getYouTubeId(video.url) !== null
}

// ── Header ────────────────────────────────────────────────────────────────────────────────────

/** "Back to the list" goes to the level's own section of /list (?section=… as the list reads it). */
export function listPathForSection(section: LevelSection): string {
  return section === 'main' ? '/list' : `/list?${new URLSearchParams({ section }).toString()}`
}

// ── Stat grid ─────────────────────────────────────────────────────────────────────────────────

/*
 * LevelStatGrid has 8 or 9 tiles (the GD level ID tile is left out when the ID is unknown) in
 * 2 columns on phones and 3 from `sm`. On phones the GD level ID (number + copy button) and the
 * difficulty badge are too wide for half a phone screen, so they take a whole row, and so does
 * the first victor at the end: every row is full whether or not the ID is known.
 */

/** A tile that takes a whole row on phones and one column from `sm`. */
export const WIDE_ON_PHONES = 'col-span-2 sm:col-span-1'

/**
 * The "First victor" tile (always the last): a whole row on phones; from `sm` it fills the
 * last row, which has two free columns when there are 8 tiles.
 */
export function firstVictorTileSpan(hasGdLevelId: boolean): string {
  return hasGdLevelId ? WIDE_ON_PHONES : 'col-span-2'
}

// ── Position history ──────────────────────────────────────────────────────────────────────────

/** Which way a position change went: 'up' = to a better (smaller) number. */
export type PositionDirection = 'up' | 'down' | 'none'

export function positionChange(
  oldPosition: number | null,
  newPosition: number | null,
): { direction: PositionDirection; places: number } {
  if (oldPosition === null || newPosition === null || oldPosition === newPosition) {
    return { direction: 'none', places: 0 }
  }
  return {
    direction: newPosition < oldPosition ? 'up' : 'down',
    places: Math.abs(oldPosition - newPosition),
  }
}

/**
 * One line of the position timeline: an 'added' or 'moved' step, or a run of consecutive
 * 'shifted' steps (the level was pushed by another level's change), which is shown smaller and,
 * from two steps up, collapsed.
 */
export type HistoryItem =
  | { kind: 'step'; entry: PositionHistoryEntry }
  | { kind: 'shifts'; entries: PositionHistoryEntry[] }

/** Groups the history (newest first, as getLevelHistory returns it) into timeline lines. */
export function groupPositionHistory(entries: readonly PositionHistoryEntry[]): HistoryItem[] {
  const items: HistoryItem[] = []
  for (const entry of entries) {
    const last = items.at(-1)
    if (entry.reason !== 'shifted') items.push({ kind: 'step', entry })
    else if (last?.kind === 'shifts') last.entries.push(entry)
    else items.push({ kind: 'shifts', entries: [entry] })
  }
  return items
}

/**
 * Where a run of shifts (newest first) took the level overall: from the oldest step's old
 * position to the newest step's new position.
 */
export function shiftRange(entries: readonly PositionHistoryEntry[]): {
  from: number | null
  to: number | null
} {
  return {
    from: entries.at(-1)?.old_position ?? null,
    to: entries[0]?.new_position ?? null,
  }
}

// ── Records table ─────────────────────────────────────────────────────────────────────────────

/*
 * RecordsTable is a real <table> from `md` up. On phones every row becomes a small card
 * (a 3-column grid: player on top; date, attempts and enjoyment side by side; then the video
 * and notes), so nothing ever scrolls sideways. The table keeps explicit ARIA roles, because
 * some browsers drop table semantics when the display of table elements changes.
 * RecordsTableSkeleton copies these shapes.
 */
export const RECORDS_TABLE = 'block w-full border-collapse text-left text-sm md:table'
export const RECORDS_HEAD = 'sr-only md:not-sr-only md:table-header-group'
export const RECORDS_BODY = 'block divide-y divide-border md:table-row-group'
export const RECORDS_ROW = 'grid grid-cols-3 gap-x-3 gap-y-3 p-4 md:table-row md:p-0'
const RECORDS_CELL = 'min-w-0 md:table-cell md:px-4 md:py-3 md:align-middle'

/**
 * A records table cell. Pass false for a cell that is left out of the phone layout (an empty
 * video or notes cell); from md up every cell shows, so the columns line up.
 */
export function recordsCell(onPhones = true): string {
  return `${onPhones ? 'block' : 'hidden'} ${RECORDS_CELL}`
}
export const RECORDS_HEADER_CELL =
  'px-4 py-3 font-mono text-[0.6875rem] font-medium tracking-widest whitespace-nowrap text-muted uppercase'
/** The small label above a value in the phone layout (the column header does it from md up). */
export const RECORDS_CELL_LABEL =
  'mb-0.5 block font-mono text-[0.625rem] font-medium tracking-widest text-muted uppercase md:hidden'

/** The columns, in order. Exported for the skeleton and tests. */
export const RECORDS_COLUMNS = [
  'Player',
  'Date',
  'Attempts',
  'Enjoyment',
  'Video',
  'Notes',
] as const
