import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getSiteStats } from '../api/stats'
import type { SiteStats } from '../types/models'
import { queryKeys } from './queryKeys'

/** The totals, charts and top-5 lists for the Stats page and the home page's stats strip. */
export function useSiteStats(): UseQueryResult<SiteStats, ApiError> {
  return useQuery<SiteStats, ApiError>({
    queryKey: queryKeys.stats(),
    queryFn: ({ signal }) => getSiteStats({ signal }),
  })
}
