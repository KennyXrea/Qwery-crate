import { DEFAULT_POINTS_SETTINGS } from '../lib/points'
import { supabase } from '../lib/supabase'
import type { SiteSettings } from '../types/models'
import { ensureOk, run, withSignal, type RequestOptions } from './request'

/**
 * What the database itself uses when the settings row is missing (the SQL reads it with
 * coalesce(…, default)), so the site shows the same sections and points the views compute.
 */
export const DEFAULT_SITE_SETTINGS: Readonly<SiteSettings> = Object.freeze({
  id: 1,
  site_name: 'Qwerty Crate',
  main_list_size: DEFAULT_POINTS_SETTINGS.mainListSize,
  extended_list_size: DEFAULT_POINTS_SETTINGS.extendedListSize,
  points_max: DEFAULT_POINTS_SETTINGS.pointsMax,
  points_decay: DEFAULT_POINTS_SETTINGS.pointsDecay,
  points_min: DEFAULT_POINTS_SETTINGS.pointsMin,
  updated_at: new Date(0).toISOString(),
})

/**
 * The site settings (list sizes and the points formula): the single site_settings row.
 * If the row is missing, the defaults are returned, exactly like the database does.
 * Pass the row to pointsSettingsFromRow() (src/lib/points.ts) for sections and points.
 */
export function getSettings(options: RequestOptions = {}): Promise<SiteSettings> {
  const { signal } = options
  return run(async () => {
    const query = supabase.from('site_settings').select('*').eq('id', 1)
    const { data } = ensureOk(await withSignal(query, signal).maybeSingle(), signal)
    return data ?? { ...DEFAULT_SITE_SETTINGS }
  }, signal)
}
