import { isDifficulty } from '../lib/format'
import { isLevelSection } from '../lib/points'
import { containsPattern, normalizeSearch } from '../lib/search'
import { isValidSlug } from '../lib/slug'
import { supabase } from '../lib/supabase'
import type {
  AdjacentLevel,
  AdjacentLevels,
  Completion,
  GdDifficulty,
  Level,
  LevelSection,
  Page,
  PositionHistoryEntry,
} from '../types/models'
import { toCompletion, toLevel, toPositionHistoryEntry } from './mappers'
import {
  emptyPage,
  ensureOk,
  isUuid,
  pageWindow,
  readPage,
  run,
  withSignal,
  type RequestOptions,
} from './request'

// ── Sorting ───────────────────────────────────────────────────────────────────────────────────

/** The sort options of the list page (?sort=…). 'position' is the default. */
export const LEVEL_SORTS = [
  'position',
  'points',
  'enjoyment',
  'attempts',
  'victors',
  'newest',
] as const

export type LevelSort = (typeof LEVEL_SORTS)[number]

export function isLevelSort(value: unknown): value is LevelSort {
  return typeof value === 'string' && (LEVEL_SORTS as readonly string[]).includes(value)
}

type OrderBy = { column: keyof Level & string; ascending: boolean; nullsFirst?: boolean }

/** Ties are always broken by position, then id, so paging never skips or repeats a level. */
const TIE_BREAKERS: readonly OrderBy[] = [
  { column: 'position', ascending: true },
  { column: 'id', ascending: true },
]

const LEVEL_SORT_ORDER: Readonly<Record<LevelSort, readonly OrderBy[]>> = {
  position: TIE_BREAKERS,
  points: [{ column: 'points', ascending: false, nullsFirst: false }, ...TIE_BREAKERS],
  enjoyment: [{ column: 'avg_enjoyment', ascending: false, nullsFirst: false }, ...TIE_BREAKERS],
  attempts: [{ column: 'avg_attempts', ascending: false, nullsFirst: false }, ...TIE_BREAKERS],
  victors: [{ column: 'victor_count', ascending: false, nullsFirst: false }, ...TIE_BREAKERS],
  newest: [{ column: 'created_at', ascending: false, nullsFirst: false }, ...TIE_BREAKERS],
}

// ── getLevels ─────────────────────────────────────────────────────────────────────────────────

export type GetLevelsParams = {
  /** Only levels in this section (Main / Extended / Legacy). */
  section?: LevelSection
  /** Text the level name must contain (ignoring case). Under 2 characters → no filter. */
  search?: string
  difficulty?: GdDifficulty
  /** Only levels this player (id) has beaten. Blank → no player filter. */
  playerId?: string
  /** Default 'position'. */
  sort?: LevelSort
  /** 1-based. Default 1. */
  page?: number
  /** Default 25, at most 100. */
  pageSize?: number
}

/** The filters getLevels() actually applies (see levelFilters). Unset ones are left out. */
export type LevelFilters = Pick<GetLevelsParams, 'section' | 'search' | 'difficulty' | 'playerId'>

/**
 * Cleans up getLevels() filters the way getLevels() applies them. Values that typically come
 * straight from the URL are forgiven instead of breaking the list:
 * - search: tidied with normalizeSearch (too short → no search);
 * - playerId: spaces trimmed and lower-cased; blank (an empty `?player=`) → no player filter;
 * - section / difficulty: an unknown value → no filter (like an unknown sort). An unknown
 *   difficulty would otherwise be refused by Postgres (22P02), an error that Retry can't fix.
 * src/hooks/queryKeys.ts uses it too, so a cache key always matches the request that fills it.
 */
export function levelFilters(params: GetLevelsParams = {}): LevelFilters {
  const filters: LevelFilters = {}
  if (isLevelSection(params.section)) filters.section = params.section
  const search = normalizeSearch(params.search ?? '')
  if (search !== '') filters.search = search
  if (isDifficulty(params.difficulty)) filters.difficulty = params.difficulty
  // Postgres compares ids without case, so 'ABC…' and 'abc…' are the same player.
  const playerId = typeof params.playerId === 'string' ? params.playerId.trim().toLowerCase() : ''
  if (playerId !== '') filters.playerId = playerId
  return filters
}

/**
 * One page of the list with filters and sorting, plus how many levels match in total.
 * An unknown playerId, or a player with no completions, gives an empty page.
 * Blank or unknown filter values are ignored (see levelFilters).
 */
export function getLevels(
  params: GetLevelsParams = {},
  options: RequestOptions = {},
): Promise<Page<Level>> {
  const { signal } = options
  return run(async () => {
    const window = pageWindow(params.page, params.pageSize)
    const filters = levelFilters(params)

    // "Levels beaten by player X": first look up which levels those are.
    let levelIds: string[] | null = null
    if (filters.playerId !== undefined) {
      if (!isUuid(filters.playerId)) return emptyPage<Level>()
      const records = supabase.from('records').select('level_id').eq('player_id', filters.playerId)
      const { data } = ensureOk(await withSignal(records, signal), signal)
      levelIds = [...new Set(data.map((row) => row.level_id))]
      if (levelIds.length === 0) return emptyPage<Level>()
    }

    let query = supabase.from('levels_view').select('*', { count: 'exact' })
    if (filters.section !== undefined) query = query.eq('section', filters.section)
    if (filters.search !== undefined) query = query.ilike('name', containsPattern(filters.search))
    if (filters.difficulty !== undefined) query = query.eq('difficulty', filters.difficulty)
    if (levelIds !== null) query = query.in('id', levelIds)

    const sort = isLevelSort(params.sort) ? params.sort : 'position'
    for (const { column, ascending, nullsFirst } of LEVEL_SORT_ORDER[sort]) {
      query = query.order(
        column,
        nullsFirst === undefined ? { ascending } : { ascending, nullsFirst },
      )
    }

    const response = await withSignal(query.range(window.from, window.to), signal)
    const page = readPage(response, window, signal)
    return { rows: page.rows.map(toLevel), total: page.total }
  }, signal)
}

// ── One level ─────────────────────────────────────────────────────────────────────────────────

/** The level with this slug, or null if there is none (an invalid slug isn't even looked up). */
export function getLevelBySlug(slug: string, options: RequestOptions = {}): Promise<Level | null> {
  const { signal } = options
  return run(async () => {
    if (!isValidSlug(slug)) return null
    const query = supabase.from('levels_view').select('*').eq('slug', slug)
    const { data } = ensureOk(await withSignal(query, signal).maybeSingle(), signal)
    return data === null ? null : toLevel(data)
  }, signal)
}

/**
 * Everyone who beat the level, in the order they did it: earliest date beaten first
 * (unknown dates last), then by when it was entered, then id. So the first row is the first
 * victor (it also has is_first_victory = true).
 */
export function getLevelRecords(
  levelId: string,
  options: RequestOptions = {},
): Promise<Completion[]> {
  const { signal } = options
  return run(async () => {
    if (!isUuid(levelId)) return []
    const query = supabase
      .from('records_view')
      .select('*')
      .eq('level_id', levelId)
      .order('date_beaten', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toCompletion)
  }, signal)
}

/** The level's position history, newest first (changed_at, then seq for same-moment steps). */
export function getLevelHistory(
  levelId: string,
  options: RequestOptions = {},
): Promise<PositionHistoryEntry[]> {
  const { signal } = options
  return run(async () => {
    if (!isUuid(levelId)) return []
    const query = supabase
      .from('level_position_history')
      .select('*')
      .eq('level_id', levelId)
      .order('changed_at', { ascending: false })
      .order('seq', { ascending: false })
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toPositionHistoryEntry)
  }, signal)
}

/**
 * The levels just above and below a position (for the previous / next links on a level page).
 * Positions are always 1…n with no gaps, so these are position − 1 and position + 1.
 */
export function getAdjacentLevels(
  position: number,
  options: RequestOptions = {},
): Promise<AdjacentLevels> {
  const { signal } = options
  return run(async () => {
    if (!Number.isInteger(position) || position < 1) return { prev: null, next: null }
    const wanted = position === 1 ? [position + 1] : [position - 1, position + 1]
    const query = supabase.from('levels').select('name, slug, position').in('position', wanted)
    const { data } = ensureOk(await withSignal(query, signal), signal)
    const find = (target: number): AdjacentLevel | null =>
      data.find((level) => level.position === target) ?? null
    return { prev: find(position - 1), next: find(position + 1) }
  }, signal)
}
