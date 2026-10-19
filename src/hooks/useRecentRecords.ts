import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getRecentRecords } from '../api/records'
import type { RecentRecordChange } from '../types/models'
import { normalizeRecentRecordsLimit, queryKeys } from './queryKeys'

/**
 * The latest completions, newest first (5 by default, at most 50), in the same order as the
 * Recent changes feed's "Completions" filter (records without a date count from the day they
 * were entered). Each one is a RecentRecordChange, so it renders with RecentChangeItem.
 */
export function useRecentRecords(limit?: number): UseQueryResult<RecentRecordChange[], ApiError> {
  const count = normalizeRecentRecordsLimit(limit)
  return useQuery<RecentRecordChange[], ApiError>({
    queryKey: queryKeys.recentRecords(count),
    queryFn: ({ signal }) => getRecentRecords(count, { signal }),
  })
}
