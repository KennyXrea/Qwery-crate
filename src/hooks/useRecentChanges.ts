import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getRecentChanges, type GetRecentChangesParams } from '../api/recent'
import type { Page, RecentChange } from '../types/models'
import { normalizeRecentChangesParams, queryKeys } from './queryKeys'

/**
 * One page of the Recent changes feed (30 per page by default), optionally only one kind.
 * The previous page stays on screen while the next one loads (`isPlaceholderData` is true then).
 */
export function useRecentChanges(
  params: GetRecentChangesParams = {},
): UseQueryResult<Page<RecentChange>, ApiError> {
  const normalized = normalizeRecentChangesParams(params)
  return useQuery<Page<RecentChange>, ApiError>({
    queryKey: queryKeys.recent.list(normalized),
    queryFn: ({ signal }) => getRecentChanges(normalized, { signal }),
    placeholderData: keepPreviousData,
  })
}
