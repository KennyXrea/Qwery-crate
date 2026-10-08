import { isLevelSort, levelFilters, type GetLevelsParams, type LevelSort } from '../api/levels'
import { isPlayerRecordSort, type GetPlayersParams, type PlayerRecordSort } from '../api/players'
import {
  isRecentChangeKind,
  RECENT_CHANGES_PAGE_SIZE,
  type GetRecentChangesParams,
} from '../api/recent'
import { DEFAULT_RECENT_RECORDS, MAX_RECENT_RECORDS } from '../api/records'
import { clampInt, pageWindow } from '../api/request'
import { normalizeSearch } from '../lib/search'

/*
 * The React Query cache keys for every query the site makes, in one place.
 *
 * Keys are arrays that start with the area they belong to ('levels', 'players', 'recent', …),
 * so later code can refresh a whole area at once after a change, e.g.
 * `queryClient.invalidateQueries({ queryKey: queryKeys.levels.all() })`.
 *
 * List parameters are NORMALISED before they go into a key: defaults are filled in, numbers are
 * clamped and search text is cleaned up exactly like the src/api functions do it. So `{}` and
 * `{ page: 1, sort: 'position' }` (which load the same rows) share one cache entry instead of
 * loading the same data twice. The hooks pass these normalised parameters to the API, so a key
 * always describes exactly the request that filled it.
 */

// ── Normalised parameters ─────────────────────────────────────────────────────────────────────

/** getLevels() parameters with the defaults filled in (what useLevels actually asks for). */
export type LevelsListParams = Omit<GetLevelsParams, 'sort' | 'page' | 'pageSize'> & {
  sort: LevelSort
  page: number
  pageSize: number
}

/** getPlayers() parameters with the defaults filled in. */
export type PlayersListParams = Omit<GetPlayersParams, 'page' | 'pageSize'> & {
  page: number
  pageSize: number
}

/** getRecentChanges() parameters with the defaults filled in. */
export type RecentChangesListParams = Omit<GetRecentChangesParams, 'page' | 'pageSize'> & {
  page: number
  pageSize: number
}

/**
 * Fills in the defaults the API uses (sort 'position', page 1, 25 per page), clamps page and
 * page size like the API does, and cleans up the filters with the API's own levelFilters()
 * (search text tidied, player id trimmed and lower-cased, blank or unknown values left out).
 * Running it twice gives the same result.
 */
export function normalizeLevelsParams(params: GetLevelsParams = {}): LevelsListParams {
  const { page, pageSize } = pageWindow(params.page, params.pageSize)
  return {
    ...levelFilters(params),
    sort: isLevelSort(params.sort) ? params.sort : 'position',
    page,
    pageSize,
  }
}

/** Like normalizeLevelsParams, for the players leaderboard. */
export function normalizePlayersParams(params: GetPlayersParams = {}): PlayersListParams {
  const { page, pageSize } = pageWindow(params.page, params.pageSize)
  const normalized: PlayersListParams = { page, pageSize }
  const search = normalizeSearch(params.search ?? '')
  if (search !== '') normalized.search = search
  return normalized
}

/** Like normalizeLevelsParams, for the Recent changes feed (30 per page by default). */
export function normalizeRecentChangesParams(
  params: GetRecentChangesParams = {},
): RecentChangesListParams {
  const { page, pageSize } = pageWindow(params.page, params.pageSize, RECENT_CHANGES_PAGE_SIZE)
  const normalized: RecentChangesListParams = { page, pageSize }
  // The API ignores an unknown kind, so it must not make a separate cache entry either.
  if (isRecentChangeKind(params.kind)) normalized.kind = params.kind
  return normalized
}

/** How many recent records getRecentRecords() returns for this limit (5 by default, 1–50). */
export function normalizeRecentRecordsLimit(limit?: number): number {
  return clampInt(limit, 1, MAX_RECENT_RECORDS, DEFAULT_RECENT_RECORDS)
}

/** The sort getPlayerRecords() uses: 'date', or 'position' for anything else. */
export function normalizePlayerRecordSort(sort?: PlayerRecordSort): PlayerRecordSort {
  return isPlayerRecordSort(sort) ? sort : 'position'
}

// ── The keys ──────────────────────────────────────────────────────────────────────────────────

export const queryKeys = {
  /** The site_settings row (list sizes and the points formula). */
  settings: () => ['settings'] as const,

  levels: {
    /** Every level query (lists, single levels, their records, history and neighbours). */
    all: () => ['levels'] as const,
    /** Every page of the list, whatever the filters. */
    lists: () => ['levels', 'list'] as const,
    list: (params?: GetLevelsParams) => ['levels', 'list', normalizeLevelsParams(params)] as const,
    detail: (slug: string) => ['levels', 'detail', slug] as const,
    records: (levelId: string) => ['levels', 'records', levelId] as const,
    history: (levelId: string) => ['levels', 'history', levelId] as const,
    adjacent: (position: number) => ['levels', 'adjacent', position] as const,
  },

  players: {
    /** Every player query (leaderboard pages, single players and their records). */
    all: () => ['players'] as const,
    lists: () => ['players', 'list'] as const,
    list: (params?: GetPlayersParams) =>
      ['players', 'list', normalizePlayersParams(params)] as const,
    detail: (slug: string) => ['players', 'detail', slug] as const,
    records: (playerId: string, sort?: PlayerRecordSort) =>
      ['players', 'records', playerId, normalizePlayerRecordSort(sort)] as const,
  },

  recent: {
    /** The Recent changes feed and the "latest records" boxes. */
    all: () => ['recent'] as const,
    lists: () => ['recent', 'list'] as const,
    list: (params?: GetRecentChangesParams) =>
      ['recent', 'list', normalizeRecentChangesParams(params)] as const,
  },

  /** The latest completions (home page and list sidebar). Lives under `recent.all()`. */
  recentRecords: (limit?: number) =>
    ['recent', 'records', normalizeRecentRecordsLimit(limit)] as const,

  /** Everything getSiteStats() returns. */
  stats: () => ['stats'] as const,

  /** Header search results for this text (cleaned up with normalizeSearch). */
  search: (q: string) => ['search', normalizeSearch(q)] as const,
}
