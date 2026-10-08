import { supabase } from '../lib/supabase'
import type { Completion } from '../types/models'
import { toCompletion } from './mappers'
import { clampInt, ensureOk, run, withSignal, type RequestOptions } from './request'

export const DEFAULT_RECENT_RECORDS = 5
export const MAX_RECENT_RECORDS = 50

/**
 * The most recent completions (for "Latest records" on the home page and the list sidebar):
 * latest date beaten first (records without a date last), then latest entered.
 * `limit` defaults to 5 and is kept between 1 and 50.
 */
export function getRecentRecords(
  limit: number = DEFAULT_RECENT_RECORDS,
  options: RequestOptions = {},
): Promise<Completion[]> {
  const { signal } = options
  return run(async () => {
    const count = clampInt(limit, 1, MAX_RECENT_RECORDS, DEFAULT_RECENT_RECORDS)
    const query = supabase
      .from('records_view')
      .select('*')
      .order('date_beaten', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(count)
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toCompletion)
  }, signal)
}
