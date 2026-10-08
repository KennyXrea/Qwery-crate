import { normalizeSearch } from '../lib/search'
import { supabase } from '../lib/supabase'
import type { SearchResult } from '../types/models'
import { toSearchResult } from './mappers'
import { ensureOk, run, withSignal, type RequestOptions } from './request'

/**
 * The header search: up to 8 levels (by position) then up to 8 players (by name) whose name
 * contains the text. Text shorter than 2 characters gives no results without asking the server.
 * The cleaned-up text is sent as it is: search_site() escapes it itself.
 */
export function searchSite(q: string, options: RequestOptions = {}): Promise<SearchResult[]> {
  const { signal } = options
  return run(async () => {
    const term = normalizeSearch(q)
    if (term === '') return []
    const query = supabase.rpc('search_site', { q: term })
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toSearchResult)
  }, signal)
}
