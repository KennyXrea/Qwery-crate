/**
 * URL query parameters of the players pages, so links to a search, a page of the leaderboard or
 * a sorted player page can be shared, and Back / Forward work:
 *   /players?q=alpha&page=2
 *   /player/player-alpha?sort=date
 */

/** /players: the search text. */
export const PLAYER_SEARCH_PARAM = 'q'

/** /players: the leaderboard page (1-based; left out for page 1). */
export const PLAYER_PAGE_PARAM = 'page'

/** /player/:slug: how the completed levels are sorted ('date'; left out for 'position'). */
export const PLAYER_SORT_PARAM = 'sort'

/** Players per leaderboard page. */
export const PLAYERS_PAGE_SIZE = 25

/** Matches the API's limit (src/api/request.ts MAX_PAGE): bigger numbers are clamped to it. */
const MAX_PAGE = 10_000

/**
 * ?page= → a page number: whole numbers from 1 up ("2" → 2, "2.7" → 2). Anything else —
 * missing, "0", "-3", "abc", "" — means page 1.
 */
export function parsePageParam(value: string | null | undefined): number {
  if (value == null || value.trim() === '') return 1
  const page = Math.trunc(Number(value))
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, MAX_PAGE)
}

/**
 * A copy of `params` with `key` set to `value`, or removed when `value` is null / '' (so default
 * values never clutter the address).
 */
export function withParam(
  params: URLSearchParams,
  key: string,
  value: string | number | null,
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (value === null || value === '') next.delete(key)
  else next.set(key, String(value))
  return next
}
