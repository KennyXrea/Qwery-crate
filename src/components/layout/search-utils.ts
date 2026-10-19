/**
 * Helpers behind the site search dialog (SearchDialog.tsx), kept out of the component file.
 */
import { useEffect, useState } from 'react'
import { levelPath, playerPath } from '../../lib/paths'
import type { LevelSearchResult, PlayerSearchResult, SearchResult } from '../../types/models'

/** How long typing has to pause before the search runs. */
export const SEARCH_DEBOUNCE_MS = 200

/** One choice in the results list. `key` is unique across both groups. */
export type SearchOption<R extends SearchResult = SearchResult> = {
  key: string
  result: R
  /** Where choosing it goes: /level/:slug or /player/:slug. */
  path: string
}

export type GroupedSearchResults = {
  levels: SearchOption<LevelSearchResult>[]
  players: SearchOption<PlayerSearchResult>[]
  /** Every option in the order they are shown (levels, then players) — for ↑ / ↓. */
  options: SearchOption[]
}

/**
 * Splits search_site() results into Levels (by position, as the server sent them) and Players,
 * each with its page address. Duplicates (same kind and id) are dropped.
 */
export function groupSearchResults(results: readonly SearchResult[]): GroupedSearchResults {
  const seen = new Set<string>()
  const levels: SearchOption<LevelSearchResult>[] = []
  const players: SearchOption<PlayerSearchResult>[] = []
  for (const result of results) {
    const key = `${result.kind}-${result.id}`
    if (seen.has(key)) continue
    seen.add(key)
    if (result.kind === 'level') levels.push({ key, result, path: levelPath(result.slug) })
    else players.push({ key, result, path: playerPath(result.slug) })
  }
  return { levels, players, options: [...levels, ...players] }
}

/**
 * The option index after pressing ↑ (-1) or ↓ (+1), wrapping around at both ends.
 * From "nothing active" (-1), ↓ goes to the first option and ↑ to the last.
 */
export function moveActiveIndex(current: number, delta: 1 | -1, count: number): number {
  if (count <= 0) return -1
  if (current < 0 || current >= count) return delta === 1 ? 0 : count - 1
  return (current + delta + count) % count
}

/** What screen readers hear once results arrive, e.g. "3 results: 2 levels and 1 player". */
export function resultsAnnouncement(levels: number, players: number): string {
  const total = levels + players
  if (total === 0) return 'No results'
  const parts = [
    levels > 0 ? `${levels} ${levels === 1 ? 'level' : 'levels'}` : null,
    players > 0 ? `${players} ${players === 1 ? 'player' : 'players'}` : null,
  ].filter(Boolean)
  return `${total} ${total === 1 ? 'result' : 'results'}: ${parts.join(' and ')}`
}

/**
 * `value`, but only once it has stopped changing for `delayMs` (the search box waits for a
 * pause in typing instead of searching on every key).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
