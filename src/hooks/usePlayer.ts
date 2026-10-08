import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getPlayerBySlug, getPlayerRecords, type PlayerRecordSort } from '../api/players'
import type { Completion, Player } from '../types/models'
import { normalizePlayerRecordSort, queryKeys } from './queryKeys'

/**
 * The player with this slug. `data` is null when there is no such player (show "Player not
 * found"). Nothing is fetched while the slug is undefined or empty.
 */
export function usePlayer(
  slug: string | null | undefined,
): UseQueryResult<Player | null, ApiError> {
  const value = slug ?? ''
  return useQuery<Player | null, ApiError>({
    queryKey: queryKeys.players.detail(value),
    queryFn: ({ signal }) => getPlayerBySlug(value, { signal }),
    enabled: value !== '',
  })
}

/**
 * Every level the player has beaten, by position (default) or by date. Waits until playerId
 * is known. When only the sort changes, the old order stays on screen until the new one
 * arrives (`isPlaceholderData` is true then); a different player never shows the previous
 * player's levels.
 */
export function usePlayerRecords(
  playerId: string | null | undefined,
  sort?: PlayerRecordSort,
): UseQueryResult<Completion[], ApiError> {
  const id = playerId ?? ''
  const order = normalizePlayerRecordSort(sort)
  const queryKey = queryKeys.players.records(id, order)
  return useQuery<Completion[], ApiError>({
    queryKey,
    queryFn: ({ signal }) => getPlayerRecords(id, { sort: order, signal }),
    enabled: id !== '',
    // queryKey[2] is the player id: keep the previous rows only for the same player.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === queryKey[2] ? previous : undefined,
  })
}
