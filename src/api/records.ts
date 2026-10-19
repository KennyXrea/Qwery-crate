import { supabase } from '../lib/supabase'
import type { RecentRecordChange } from '../types/models'
import { toRecentRecordChange } from './mappers'
import { clampInt, ensureOk, run, withSignal, type RequestOptions } from './request'

export const DEFAULT_RECENT_RECORDS = 5
export const MAX_RECENT_RECORDS = 50

/**
 * The most recent completions (for "Latest records" on the home page and the list sidebar),
 * read from the Recent changes feed so they appear in exactly the same order as its
 * "Completions" filter: by the day it happened (the date beaten, or — for a record entered
 * without a date — the day it was entered), then when it was entered, then id.
 * So a completion added today without a date still shows up at the top instead of last.
 * `limit` defaults to 5 and is kept between 1 and 50.
 */
export function getRecentRecords(
  limit: number = DEFAULT_RECENT_RECORDS,
  options: RequestOptions = {},
): Promise<RecentRecordChange[]> {
  const { signal } = options
  return run(async () => {
    const count = clampInt(limit, 1, MAX_RECENT_RECORDS, DEFAULT_RECENT_RECORDS)
    const query = supabase
      .from('recent_changes_view')
      .select('*')
      .eq('kind', 'record')
      .order('event_date', { ascending: false })
      .order('happened_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(count)
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toRecentRecordChange)
  }, signal)
}
