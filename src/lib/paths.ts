import type { RecentChangeKind } from '../types/models'

/**
 * The site's internal addresses, built in one place so every link agrees.
 * Slugs are already URL-safe (see slug.ts), but they're encoded anyway so a bad one can never
 * break out of its path segment.
 */

/** "/level/sample-level-1" */
export function levelPath(slug: string): string {
  return `/level/${encodeURIComponent(slug)}`
}

/** "/player/player-alpha" */
export function playerPath(slug: string): string {
  return `/player/${encodeURIComponent(slug)}`
}

/** The query parameter of /recent that holds the filter chip (one RecentChangeKind). */
export const RECENT_KIND_PARAM = 'kind'

/** "/recent", or "/recent?kind=record" for one kind of change (the page's filter chips). */
export function recentPath(kind?: RecentChangeKind): string {
  if (!kind) return '/recent'
  return `/recent?${new URLSearchParams({ [RECENT_KIND_PARAM]: kind }).toString()}`
}
