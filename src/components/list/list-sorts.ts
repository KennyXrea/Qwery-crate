/**
 * The orders the list can be sorted in (?sort=…) and their friendly names.
 *
 * Components don't import src/api, so the sort type comes from the hooks (useLevels accepts
 * exactly the API's LEVEL_SORTS). The label table must name every one of them and nothing
 * else (TypeScript checks that), and a test checks it lists them in the API's order.
 */
import type { LevelsListParams } from '../../hooks/queryKeys'

/** A sort order useLevels understands ('position', 'points', …). */
export type LevelSort = LevelsListParams['sort']

/** Friendly names for the sort select, in the order they are offered. */
export const LEVEL_SORT_LABELS = {
  position: 'List position',
  points: 'Most points',
  enjoyment: 'Most enjoyed',
  attempts: 'Most attempts',
  victors: 'Most victors',
  newest: 'Newest added',
} as const satisfies Readonly<Record<LevelSort, string>>

/** Every sort order. */
export const LIST_SORTS: readonly LevelSort[] = Object.freeze(
  Object.keys(LEVEL_SORT_LABELS) as LevelSort[],
)

/** True for a sort order the list knows (same answer as isLevelSort in src/api/levels.ts). */
export function isListSort(value: unknown): value is LevelSort {
  return typeof value === 'string' && Object.hasOwn(LEVEL_SORT_LABELS, value)
}
