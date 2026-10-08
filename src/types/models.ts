/**
 * The data types the site works with, built from the generated database types
 * (src/types/database.ts, made by `npm run db:types`).
 *
 * Why not use the generated types directly? Postgres can't tell the type generator which columns
 * of a VIEW are never null, so every view column comes out as `T | null`. These types fix that:
 * a column that can never be null (because of how the SQL view is written — see
 * supabase/migrations/…_functions_views.sql) is non-null here. The mappers in
 * src/api/mappers.ts check this when data arrives and throw an ApiError if the database ever
 * sends null in one of them.
 *
 * Field names stay exactly as the database names them (snake_case), so the helpers in src/lib
 * (levelThumbnail, playerAvatarUrl, pointsSettingsFromRow, …) accept these objects as they are.
 */
import type { GdDifficulty as HandWrittenGdDifficulty } from '../lib/format'
import type { LevelSection } from '../lib/points'
import type { Database } from './database'

export type { LevelSection }

type PublicSchema = Database['public']
type ViewRow<Name extends keyof PublicSchema['Views']> = PublicSchema['Views'][Name]['Row']
type TableRow<Name extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][Name]['Row']

/** Flattens `A & B` into one plain object type, so editors show the final fields. */
type Simplify<T> = { [K in keyof T]: T[K] } & unknown

/**
 * `Row` with the columns in `Required` made non-null, then the fields in `Overrides` replaced
 * by narrower types (e.g. `section: string | null` → `section: LevelSection`).
 */
type ModelOf<
  Row,
  Required extends keyof Row,
  Overrides extends Partial<Record<keyof Row, unknown>> = Record<never, never>,
> = Simplify<
  Omit<Row, Required | keyof Overrides> & {
    [K in Exclude<Required, keyof Overrides>]-?: NonNullable<Row[K]>
  } & Overrides
>

// ── Difficulty ────────────────────────────────────────────────────────────────────────────────

type DatabaseGdDifficulty = PublicSchema['Enums']['gd_difficulty']
type IsSameUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type MustBeTrue<T extends true> = T

/**
 * A level's in-game difficulty ('easy_demon', 'extreme_demon', …).
 * The list is written by hand in src/lib/format.ts (DIFFICULTIES) and also generated from the
 * database enum. If the two ever differ, THIS LINE stops compiling with
 * "Type 'false' does not satisfy the constraint 'true'": update DIFFICULTIES (and its labels).
 */
export type GdDifficulty =
  MustBeTrue<IsSameUnion<HandWrittenGdDifficulty, DatabaseGdDifficulty>> extends true
    ? HandWrittenGdDifficulty
    : never

// ── Levels (levels_view) ──────────────────────────────────────────────────────────────────────

/**
 * levels_view columns that are never null: the levels table's NOT NULL columns, the computed
 * section and points, and victor_count (coalesce(…, 0)).
 */
export type LevelRequiredColumn =
  | 'id'
  | 'position'
  | 'name'
  | 'slug'
  | 'difficulty'
  | 'created_at'
  | 'updated_at'
  | 'section'
  | 'points'
  | 'victor_count'

/**
 * A level on the list (one levels_view row): the level itself plus its section, points
 * (0 in Legacy), victor count, average enjoyment / attempts (null when unknown) and its first
 * victor (all first_victor_* fields are null when nobody has beaten it yet).
 */
export type Level = ModelOf<
  ViewRow<'levels_view'>,
  LevelRequiredColumn,
  { section: LevelSection; difficulty: GdDifficulty }
>

/** The few fields the previous / next links on a level page need. */
export type AdjacentLevel = Pick<TableRow<'levels'>, 'name' | 'slug' | 'position'>

export type AdjacentLevels = { prev: AdjacentLevel | null; next: AdjacentLevel | null }

// ── Players (players_view) ────────────────────────────────────────────────────────────────────

/** players_view columns that are never null (the counters are coalesce(…, 0)). */
export type PlayerRequiredColumn =
  | 'id'
  | 'name'
  | 'slug'
  | 'created_at'
  | 'updated_at'
  | 'total_points'
  | 'completions'
  | 'first_victories'

/**
 * A player with their score (one players_view row).
 * - rank is null for players with no completions (they are listed after everyone ranked).
 * - hardest_level_* are all null together when they have no completions.
 * - total_attempts is null when they have completions but none has an attempt count.
 */
export type Player = ModelOf<ViewRow<'players_view'>, PlayerRequiredColumn>

// ── Completions (records_view) ────────────────────────────────────────────────────────────────

/** records_view columns that are never null (everything except the record's optional fields). */
export type CompletionRequiredColumn =
  | 'id'
  | 'level_id'
  | 'player_id'
  | 'created_at'
  | 'updated_at'
  | 'level_name'
  | 'level_slug'
  | 'level_position'
  | 'level_section'
  | 'level_points'
  | 'level_difficulty'
  | 'player_name'
  | 'player_slug'
  | 'is_first_victory'

/**
 * "Player X beat level Y" (one records_view row) with the level's and player's details.
 * attempts, enjoyment, date_beaten, video_url, notes and player_country_code may be null.
 * (Named Completion, not Record, because TypeScript already has a built-in `Record` type.)
 */
export type Completion = ModelOf<
  ViewRow<'records_view'>,
  CompletionRequiredColumn,
  { level_section: LevelSection; level_difficulty: GdDifficulty }
>

// ── Recent changes (recent_changes_view) ──────────────────────────────────────────────────────

type RecentChangeRow = ViewRow<'recent_changes_view'>

/** Fields every recent change has, whatever its kind. */
type RecentChangeBase = ModelOf<
  Omit<
    RecentChangeRow,
    'kind' | 'player_id' | 'player_name' | 'player_slug' | 'old_position' | 'new_position'
  >,
  'id' | 'happened_at' | 'event_date' | 'level_id' | 'level_name' | 'level_slug'
>

/** A player beat a level. attempts and video_url may be null. */
export type RecentRecordChange = Simplify<
  RecentChangeBase & {
    kind: 'record'
    player_id: string
    player_name: string
    player_slug: string
    old_position: null
    new_position: null
  }
>

/** A level was added to the list at new_position. */
export type RecentLevelAddedChange = Simplify<
  Omit<RecentChangeBase, 'attempts' | 'video_url'> & {
    kind: 'level_added'
    player_id: null
    player_name: null
    player_slug: null
    old_position: null
    new_position: number
    attempts: null
    video_url: null
  }
>

/** An admin moved a level from old_position to new_position. */
export type RecentLevelMovedChange = Simplify<
  Omit<RecentChangeBase, 'attempts' | 'video_url'> & {
    kind: 'level_moved'
    player_id: null
    player_name: null
    player_slug: null
    old_position: number
    new_position: number
    attempts: null
    video_url: null
  }
>

/**
 * One line of the "Recent changes" feed. Check `kind` first; TypeScript then knows which
 * fields are set (e.g. player_name for 'record', old_position for 'level_moved').
 * event_date is the day it happened ('YYYY-MM-DD'; the date beaten for records),
 * happened_at is when it was entered on the site.
 */
export type RecentChange = RecentRecordChange | RecentLevelAddedChange | RecentLevelMovedChange

export type RecentChangeKind = RecentChange['kind']

// ── Position history (level_position_history) ─────────────────────────────────────────────────

/** 'added' = new level, 'moved' = an admin moved it, 'shifted' = another level's move pushed it. */
export type PositionChangeReason = 'added' | 'moved' | 'shifted'

/** One step in a level's ranking history. old_position is null for 'added'. */
export type PositionHistoryEntry = Simplify<
  Omit<TableRow<'level_position_history'>, 'reason'> & { reason: PositionChangeReason }
>

// ── Settings (site_settings) ──────────────────────────────────────────────────────────────────

/** The site_settings row: list sizes and the points formula. */
export type SiteSettings = TableRow<'site_settings'>

// ── Search (search_site) ──────────────────────────────────────────────────────────────────────

type SearchRow = PublicSchema['Functions']['search_site']['Returns'][number]

export type LevelSearchResult = Simplify<
  Omit<SearchRow, 'kind' | 'position'> & { kind: 'level'; position: number }
>

/** Players have no position (the generated type wrongly says it is always a number). */
export type PlayerSearchResult = Simplify<
  Omit<SearchRow, 'kind' | 'position'> & { kind: 'player'; position: null }
>

/** One match from the header search: levels first (by position), then players (by name). */
export type SearchResult = LevelSearchResult | PlayerSearchResult

// ── Lists and statistics ──────────────────────────────────────────────────────────────────────

/** One page of a longer list plus how many rows the whole list has (for the page numbers). */
export type Page<T> = { rows: T[]; total: number }

export type DifficultyCount = { difficulty: GdDifficulty; count: number }

/** Completions in one calendar month; month is 'YYYY-MM'. */
export type MonthCount = { month: string; count: number }

/** Everything the Stats page and the home page's stats strip show. */
export type SiteStats = {
  levels: number
  players: number
  records: number
  /** Sum of every known attempt count (records without one are skipped). */
  totalAttempts: number
  /** All 11 difficulties, easiest first (DIFFICULTIES order), including zeros. */
  difficultyDistribution: DifficultyCount[]
  /** By date beaten, oldest month first, months with no completions included as 0. */
  completionsPerMonth: MonthCount[]
  /** Completions without a date beaten (not in completionsPerMonth). */
  undatedCompletions: number
  /** Top 5 levels by average enjoyment (levels without any enjoyment rating are skipped). */
  mostEnjoyed: Level[]
  /** Top 5 levels by average attempts (levels without any attempt count are skipped). */
  mostAttempts: Level[]
}
