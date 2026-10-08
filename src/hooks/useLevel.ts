import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getAdjacentLevels, getLevelBySlug, getLevelHistory, getLevelRecords } from '../api/levels'
import type { AdjacentLevels, Completion, Level, PositionHistoryEntry } from '../types/models'
import { queryKeys } from './queryKeys'

/*
 * The level page's data. Only useLevel needs the slug from the URL; the others wait for the
 * level to load (pass `level?.id` / `level?.position`) and don't run until it's known.
 * A query that is waiting has status 'pending' with fetchStatus 'idle' (so `isLoading` is
 * false but `isPending` is true).
 */

/**
 * The level with this slug. `data` is null when there is no such level (show "Level not
 * found"). Nothing is fetched while the slug is undefined or empty.
 */
export function useLevel(slug: string | null | undefined): UseQueryResult<Level | null, ApiError> {
  const value = slug ?? ''
  return useQuery<Level | null, ApiError>({
    queryKey: queryKeys.levels.detail(value),
    queryFn: ({ signal }) => getLevelBySlug(value, { signal }),
    enabled: value !== '',
  })
}

/** Everyone who beat the level, first victor first. Waits until levelId is known. */
export function useLevelRecords(
  levelId: string | null | undefined,
): UseQueryResult<Completion[], ApiError> {
  const id = levelId ?? ''
  return useQuery<Completion[], ApiError>({
    queryKey: queryKeys.levels.records(id),
    queryFn: ({ signal }) => getLevelRecords(id, { signal }),
    enabled: id !== '',
  })
}

/** The level's position history, newest first. Waits until levelId is known. */
export function useLevelHistory(
  levelId: string | null | undefined,
): UseQueryResult<PositionHistoryEntry[], ApiError> {
  const id = levelId ?? ''
  return useQuery<PositionHistoryEntry[], ApiError>({
    queryKey: queryKeys.levels.history(id),
    queryFn: ({ signal }) => getLevelHistory(id, { signal }),
    enabled: id !== '',
  })
}

/** The previous / next levels by position. Waits until the position is a real one (1, 2, …). */
export function useAdjacentLevels(
  position: number | null | undefined,
): UseQueryResult<AdjacentLevels, ApiError> {
  const value = position ?? 0
  return useQuery<AdjacentLevels, ApiError>({
    queryKey: queryKeys.levels.adjacent(value),
    queryFn: ({ signal }) => getAdjacentLevels(value, { signal }),
    enabled: Number.isInteger(value) && value >= 1,
  })
}
