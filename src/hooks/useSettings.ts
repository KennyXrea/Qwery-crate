import { useQuery, type QueryFunctionContext, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getSettings } from '../api/settings'
import { DEFAULT_POINTS_SETTINGS, pointsSettingsFromRow, type PointsSettings } from '../lib/points'
import type { SiteSettings } from '../types/models'
import { queryKeys } from './queryKeys'

function fetchSettings({ signal }: QueryFunctionContext): Promise<SiteSettings> {
  return getSettings({ signal })
}

/** The site_settings row (site name, list sizes, points formula). */
export function useSettings(): UseQueryResult<SiteSettings, ApiError> {
  return useQuery<SiteSettings, ApiError>({
    queryKey: queryKeys.settings(),
    queryFn: fetchSettings,
  })
}

/**
 * The list sizes and points formula, ready for src/lib/points.ts (levelSection, sectionRange,
 * levelPoints …). It shares useSettings()'s cache entry. Until the settings have loaded — or
 * if they can't be loaded — it returns the database defaults (Main 1–25, Extended 26–50, …),
 * so pages can always render. Use useSettings() when you need to know whether they are real.
 */
export function usePointsSettings(): Readonly<PointsSettings> {
  const { data } = useQuery<SiteSettings, ApiError, PointsSettings>({
    queryKey: queryKeys.settings(),
    queryFn: fetchSettings,
    // A module-level function, so React Query only recomputes it when the row changes.
    select: pointsSettingsFromRow,
  })
  return data ?? DEFAULT_POINTS_SETTINGS
}
