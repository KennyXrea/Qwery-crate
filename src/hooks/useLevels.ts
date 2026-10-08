import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getLevels, type GetLevelsParams } from '../api/levels'
import type { Level, Page } from '../types/models'
import { normalizeLevelsParams, queryKeys } from './queryKeys'

/**
 * One page of the list with filters and sorting (see getLevels in src/api/levels.ts).
 * While the next page / filter loads, the previous rows stay on screen: `isPlaceholderData`
 * is true then, so the page can dim them instead of flashing a skeleton.
 */
export function useLevels(params: GetLevelsParams = {}): UseQueryResult<Page<Level>, ApiError> {
  const normalized = normalizeLevelsParams(params)
  return useQuery<Page<Level>, ApiError>({
    queryKey: queryKeys.levels.list(normalized),
    queryFn: ({ signal }) => getLevels(normalized, { signal }),
    placeholderData: keepPreviousData,
  })
}
