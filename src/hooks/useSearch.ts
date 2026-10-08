import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { searchSite } from '../api/search'
import { normalizeSearch } from '../lib/search'
import type { SearchResult } from '../types/models'
import { queryKeys } from './queryKeys'

/**
 * Header search results (levels first, then players) for what was typed.
 * Nothing is fetched until the text has at least 2 real characters (see normalizeSearch);
 * until then the query waits (status 'pending', fetchStatus 'idle') and `data` is undefined.
 * While a longer text loads, the previous results stay on screen (`isPlaceholderData`).
 * Debounce the text in the component; this hook searches for whatever it is given.
 */
export function useSearch(q: string): UseQueryResult<SearchResult[], ApiError> {
  const term = normalizeSearch(q)
  return useQuery<SearchResult[], ApiError>({
    queryKey: queryKeys.search(term),
    queryFn: ({ signal }) => searchSite(term, { signal }),
    enabled: term !== '',
    // Keep the previous results while typing, but not once the box is (nearly) empty again.
    placeholderData: (previous) => (term === '' ? undefined : previous),
  })
}
