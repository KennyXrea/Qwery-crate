import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getRecentRecords } from '../api/records'
import type { Completion } from '../types/models'
import { normalizeRecentRecordsLimit, queryKeys } from './queryKeys'

/** The latest completions, newest first (5 by default, at most 50). */
export function useRecentRecords(limit?: number): UseQueryResult<Completion[], ApiError> {
  const count = normalizeRecentRecordsLimit(limit)
  return useQuery<Completion[], ApiError>({
    queryKey: queryKeys.recentRecords(count),
    queryFn: ({ signal }) => getRecentRecords(count, { signal }),
  })
}
