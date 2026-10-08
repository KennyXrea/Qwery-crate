import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '../api/errors'
import { getPlayers, type GetPlayersParams } from '../api/players'
import type { Page, Player } from '../types/models'
import { normalizePlayersParams, queryKeys } from './queryKeys'

/**
 * One page of the players leaderboard (best rank first). Like useLevels, the previous page
 * stays on screen while the next one loads (`isPlaceholderData` is true then).
 */
export function usePlayers(params: GetPlayersParams = {}): UseQueryResult<Page<Player>, ApiError> {
  const normalized = normalizePlayersParams(params)
  return useQuery<Page<Player>, ApiError>({
    queryKey: queryKeys.players.list(normalized),
    queryFn: ({ signal }) => getPlayers(normalized, { signal }),
    placeholderData: keepPreviousData,
  })
}
