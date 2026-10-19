import { isDifficulty } from '../lib/format'
import { isLevelSection } from '../lib/points'
import type { Database } from '../types/database'
import type {
  Completion,
  CompletionRequiredColumn,
  GdDifficulty,
  Level,
  LevelRequiredColumn,
  LevelSection,
  Player,
  PlayerRequiredColumn,
  PositionChangeReason,
  PositionHistoryEntry,
  RecentChange,
  RecentRecordChange,
  SearchResult,
} from '../types/models'
import { ApiError, UNEXPECTED_DATA_CODE, UNEXPECTED_DATA_MESSAGE } from './errors'

/**
 * Turn rows as the database sends them into the app's types (src/types/models.ts).
 * Every column the SQL guarantees is never null is checked, and text columns with a fixed set
 * of values (section, difficulty, kind, reason) are checked against that set. If a row breaks
 * those promises — which means the database and this code no longer agree — an ApiError is
 * thrown instead of letting a null crash some page later.
 */

type Schema = Database['public']
export type LevelsViewRow = Schema['Views']['levels_view']['Row']
export type PlayersViewRow = Schema['Views']['players_view']['Row']
export type RecordsViewRow = Schema['Views']['records_view']['Row']
export type RecentChangesViewRow = Schema['Views']['recent_changes_view']['Row']
export type PositionHistoryRow = Schema['Tables']['level_position_history']['Row']
export type SearchSiteRow = Schema['Functions']['search_site']['Returns'][number]

/** The error for a row that breaks what the SQL promises. */
export function unexpectedData(source: string, column: string, value: unknown): ApiError {
  const shown = value === null ? 'null' : value === undefined ? 'missing' : JSON.stringify(value)
  return new ApiError({
    kind: 'unknown',
    code: UNEXPECTED_DATA_CODE,
    message: UNEXPECTED_DATA_MESSAGE,
    cause: new Error(`${source}.${column} was ${shown}`),
  })
}

type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> }

/**
 * Checks that every listed column has a value. `required` lists the columns as an object
 * ({ id: true, … }) so TypeScript makes sure it names exactly the columns of the model type.
 */
function requireColumns<T extends object, K extends keyof T & string>(
  row: T,
  required: Readonly<Record<K, true>>,
  source: string,
): WithRequired<T, K> {
  for (const column of Object.keys(required) as K[]) {
    if (row[column] === null || row[column] === undefined) {
      throw unexpectedData(source, column, row[column])
    }
  }
  return row as WithRequired<T, K>
}

function section(value: unknown, source: string, column: string): LevelSection {
  if (isLevelSection(value)) return value
  throw unexpectedData(source, column, value)
}

function difficulty(value: unknown, source: string, column: string): GdDifficulty {
  if (isDifficulty(value)) return value
  throw unexpectedData(source, column, value)
}

function requiredNumber(value: unknown, source: string, column: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw unexpectedData(source, column, value)
}

function requiredText(value: unknown, source: string, column: string): string {
  if (typeof value === 'string') return value
  throw unexpectedData(source, column, value)
}

// ── levels_view ───────────────────────────────────────────────────────────────────────────────

const LEVEL_REQUIRED: Readonly<Record<LevelRequiredColumn, true>> = {
  id: true,
  position: true,
  name: true,
  slug: true,
  difficulty: true,
  created_at: true,
  updated_at: true,
  section: true,
  points: true,
  victor_count: true,
}

export function toLevel(row: LevelsViewRow): Level {
  const source = 'levels_view'
  const checked = requireColumns(row, LEVEL_REQUIRED, source)
  return {
    ...checked,
    section: section(checked.section, source, 'section'),
    difficulty: difficulty(checked.difficulty, source, 'difficulty'),
  }
}

// ── players_view ──────────────────────────────────────────────────────────────────────────────

const PLAYER_REQUIRED: Readonly<Record<PlayerRequiredColumn, true>> = {
  id: true,
  name: true,
  slug: true,
  created_at: true,
  updated_at: true,
  total_points: true,
  completions: true,
  first_victories: true,
}

export function toPlayer(row: PlayersViewRow): Player {
  return requireColumns(row, PLAYER_REQUIRED, 'players_view')
}

// ── records_view ──────────────────────────────────────────────────────────────────────────────

const COMPLETION_REQUIRED: Readonly<Record<CompletionRequiredColumn, true>> = {
  id: true,
  level_id: true,
  player_id: true,
  created_at: true,
  updated_at: true,
  level_name: true,
  level_slug: true,
  level_position: true,
  level_section: true,
  level_points: true,
  level_difficulty: true,
  player_name: true,
  player_slug: true,
  is_first_victory: true,
}

export function toCompletion(row: RecordsViewRow): Completion {
  const source = 'records_view'
  const checked = requireColumns(row, COMPLETION_REQUIRED, source)
  return {
    ...checked,
    level_section: section(checked.level_section, source, 'level_section'),
    level_difficulty: difficulty(checked.level_difficulty, source, 'level_difficulty'),
  }
}

// ── recent_changes_view ───────────────────────────────────────────────────────────────────────

const RECENT_CHANGE_REQUIRED = {
  id: true,
  happened_at: true,
  event_date: true,
  level_id: true,
  level_name: true,
  level_slug: true,
} as const satisfies Partial<Record<keyof RecentChangesViewRow, true>>

export function toRecentChange(row: RecentChangesViewRow): RecentChange {
  const source = 'recent_changes_view'
  const base = requireColumns(row, RECENT_CHANGE_REQUIRED, source)
  const common = {
    id: base.id,
    happened_at: base.happened_at,
    event_date: base.event_date,
    level_id: base.level_id,
    level_name: base.level_name,
    level_slug: base.level_slug,
  }
  switch (base.kind) {
    case 'record':
      return {
        ...common,
        kind: 'record',
        player_id: requiredText(base.player_id, source, 'player_id'),
        player_name: requiredText(base.player_name, source, 'player_name'),
        player_slug: requiredText(base.player_slug, source, 'player_slug'),
        old_position: null,
        new_position: null,
        attempts: base.attempts,
        video_url: base.video_url,
      }
    case 'level_added':
      return {
        ...common,
        kind: 'level_added',
        player_id: null,
        player_name: null,
        player_slug: null,
        old_position: null,
        new_position: requiredNumber(base.new_position, source, 'new_position'),
        attempts: null,
        video_url: null,
      }
    case 'level_moved':
      return {
        ...common,
        kind: 'level_moved',
        player_id: null,
        player_name: null,
        player_slug: null,
        old_position: requiredNumber(base.old_position, source, 'old_position'),
        new_position: requiredNumber(base.new_position, source, 'new_position'),
        attempts: null,
        video_url: null,
      }
    default:
      throw unexpectedData(source, 'kind', base.kind)
  }
}

/** A recent_changes_view row that must be a completion (kind 'record'). */
export function toRecentRecordChange(row: RecentChangesViewRow): RecentRecordChange {
  const change = toRecentChange(row)
  if (change.kind !== 'record') throw unexpectedData('recent_changes_view', 'kind', change.kind)
  return change
}

// ── level_position_history ────────────────────────────────────────────────────────────────────

const REASONS: ReadonlySet<string> = new Set<PositionChangeReason>(['added', 'moved', 'shifted'])

function isReason(value: unknown): value is PositionChangeReason {
  return typeof value === 'string' && REASONS.has(value)
}

export function toPositionHistoryEntry(row: PositionHistoryRow): PositionHistoryEntry {
  if (!isReason(row.reason)) throw unexpectedData('level_position_history', 'reason', row.reason)
  return { ...row, reason: row.reason }
}

// ── search_site() ─────────────────────────────────────────────────────────────────────────────

export function toSearchResult(row: SearchSiteRow): SearchResult {
  const source = 'search_site'
  const id = requiredText(row.id, source, 'id')
  const name = requiredText(row.name, source, 'name')
  const slug = requiredText(row.slug, source, 'slug')
  if (row.kind === 'level') {
    return {
      kind: 'level',
      id,
      name,
      slug,
      position: requiredNumber(row.position, source, 'position'),
    }
  }
  if (row.kind === 'player') return { kind: 'player', id, name, slug, position: null }
  throw unexpectedData(source, 'kind', row.kind)
}
