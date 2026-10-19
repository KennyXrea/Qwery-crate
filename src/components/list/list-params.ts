/**
 * The list page's state, kept in the URL query string so Back / Forward and shared links work:
 *
 *   /list?section=extended&q=sample&difficulty=extreme_demon&player=player-alpha&sort=points&view=table&page=2
 *
 * Every value is checked when it is read (isLevelSection / isDifficulty / isListSort / …):
 * anything unknown falls back to its default instead of breaking the page. Default values are
 * left out of the URL, so the plain list is just "/list".
 */
import { isDifficulty, type GdDifficulty } from '../../lib/format'
import { isLevelSection, type LevelSection } from '../../lib/points'
import { MAX_SEARCH_LENGTH, normalizeSearch } from '../../lib/search'
import { isListSort, type LevelSort } from './list-sorts'

/** The two ways to show the levels. Cards is the default (PLAN §13). */
export const LIST_VIEWS = ['cards', 'table'] as const

export type ListView = (typeof LIST_VIEWS)[number]

export function isListView(value: unknown): value is ListView {
  return typeof value === 'string' && (LIST_VIEWS as readonly string[]).includes(value)
}

/** Levels per page. */
export const LIST_PAGE_SIZE = 25

/** How long the search box waits after the last key press before it updates the list. */
export const SEARCH_DEBOUNCE_MS = 300

/** Same cap as the API (MAX_PAGE in src/api/request.ts): absurd ?page= values stop here. */
const MAX_LIST_PAGE = 10_000

/** Longer ?player= values can't be a slug (those are at most 80 characters); cut them here. */
const MAX_PLAYER_PARAM_LENGTH = 100

export type ListParams = {
  section: LevelSection
  /** Search text as typed (tidied up; may be a single character, which the API ignores). */
  q: string
  difficulty: GdDifficulty | null
  /** The player filter as a player SLUG ("levels beaten by player-alpha"). */
  player: string | null
  sort: LevelSort
  view: ListView
  /** 1-based. */
  page: number
}

export const DEFAULT_LIST_PARAMS: Readonly<ListParams> = Object.freeze({
  section: 'main',
  q: '',
  difficulty: null,
  player: null,
  sort: 'position',
  view: 'cards',
  page: 1,
})

/** The query parameter names, in the order they are written to the URL. */
export const LIST_PARAM_KEYS = [
  'section',
  'q',
  'difficulty',
  'player',
  'sort',
  'view',
  'page',
] as const satisfies readonly (keyof ListParams)[]

/** The values that choose WHICH levels are listed (changing one goes back to page 1). */
const FILTER_KEYS = [
  'section',
  'q',
  'difficulty',
  'player',
  'sort',
] as const satisfies readonly (keyof ListParams)[]

/**
 * Tidies search text the way it is stored in the URL: runs of spaces / control characters
 * become one space, the ends are trimmed and it is cut to MAX_SEARCH_LENGTH characters.
 * Unlike normalizeSearch (src/lib/search.ts) a single character is kept, so the box can show it.
 */
export function tidySearchText(text: string): string {
  const cleaned = text
    .replace(/\p{Cs}/gu, '')
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .trim()
  const chars = Array.from(cleaned)
  return chars.length <= MAX_SEARCH_LENGTH
    ? cleaned
    : chars.slice(0, MAX_SEARCH_LENGTH).join('').trimEnd()
}

/** True when the search text is long enough to filter the list (2+ characters). */
export function isSearchActive(q: string): boolean {
  return normalizeSearch(q) !== ''
}

/** "?player=Player-Alpha " → "player-alpha" (slugs are lower case); blank → null. */
function tidyPlayer(value: string): string | null {
  const slug = Array.from(value.trim().toLowerCase()).slice(0, MAX_PLAYER_PARAM_LENGTH).join('')
  return slug === '' ? null : slug
}

/** "3" → 3. Anything that isn't a whole number from 1 up → 1; huge numbers stop at the cap. */
function parsePage(value: string): number {
  const text = value.trim()
  if (!/^\d+$/.test(text)) return 1
  const page = Number(text)
  if (!Number.isSafeInteger(page) || page < 1) return 1
  return Math.min(page, MAX_LIST_PAGE)
}

/** Reads the list state from a query string (or URLSearchParams). Unknown values → defaults. */
export function parseListParams(search: URLSearchParams | string): ListParams {
  const query = typeof search === 'string' ? new URLSearchParams(search) : search
  const read = (key: string) => query.get(key) ?? ''
  const keyword = (key: string) => read(key).trim().toLowerCase()

  const section = keyword('section')
  const difficulty = keyword('difficulty')
  const sort = keyword('sort')
  const view = keyword('view')

  return {
    section: isLevelSection(section) ? section : DEFAULT_LIST_PARAMS.section,
    q: tidySearchText(read('q')),
    difficulty: isDifficulty(difficulty) ? difficulty : null,
    player: tidyPlayer(read('player')),
    sort: isListSort(sort) ? sort : DEFAULT_LIST_PARAMS.sort,
    view: isListView(view) ? view : DEFAULT_LIST_PARAMS.view,
    page: parsePage(read('page')),
  }
}

/** Writes the list state as query parameters, leaving out every default value. */
export function serializeListParams(params: ListParams): URLSearchParams {
  const query = new URLSearchParams()
  const q = tidySearchText(params.q)
  const player = params.player === null ? null : tidyPlayer(params.player)
  const page = Number.isSafeInteger(params.page) ? Math.min(params.page, MAX_LIST_PAGE) : 1

  if (isLevelSection(params.section) && params.section !== DEFAULT_LIST_PARAMS.section) {
    query.set('section', params.section)
  }
  if (q !== '') query.set('q', q)
  if (isDifficulty(params.difficulty)) query.set('difficulty', params.difficulty)
  if (player !== null) query.set('player', player)
  if (isListSort(params.sort) && params.sort !== DEFAULT_LIST_PARAMS.sort) {
    query.set('sort', params.sort)
  }
  if (isListView(params.view) && params.view !== DEFAULT_LIST_PARAMS.view) {
    query.set('view', params.view)
  }
  if (page > 1) query.set('page', String(page))
  return query
}

/** "?section=extended&view=table", or "" for the defaults (ready for a link's `search`). */
export function listSearch(params: ListParams): string {
  const query = serializeListParams(params).toString()
  return query === '' ? '' : `?${query}`
}

/** True when both describe the same URL. */
export function isSameListParams(a: ListParams, b: ListParams): boolean {
  return serializeListParams(a).toString() === serializeListParams(b).toString()
}

/**
 * The state after a change. Changing a filter (section, search, difficulty, player or sort)
 * goes back to page 1 unless the change sets the page itself; switching the view keeps the
 * page. The result is tidied exactly like a URL that is read back.
 */
export function updateListParams(current: ListParams, patch: Partial<ListParams>): ListParams {
  const before = parseListParams(serializeListParams(current))
  const after = parseListParams(serializeListParams({ ...before, ...patch }))
  const filterChanged = FILTER_KEYS.some((key) => before[key] !== after[key])
  if (filterChanged && patch.page === undefined) return { ...after, page: 1 }
  return after
}

/** Search, difficulty and player: what "Clear filters" resets. */
export function hasActiveFilters(params: ListParams): boolean {
  return tidySearchText(params.q) !== '' || params.difficulty !== null || params.player !== null
}

/** The filters behind the phone's "Filters" button (difficulty, player, a non-default sort). */
export function hiddenFilterCount(params: ListParams): number {
  return [
    params.difficulty !== null,
    params.player !== null,
    params.sort !== DEFAULT_LIST_PARAMS.sort,
  ].filter(Boolean).length
}

/** What "Clear filters" changes. */
export const CLEARED_FILTERS = {
  q: '',
  difficulty: null,
  player: null,
} as const satisfies Partial<ListParams>
