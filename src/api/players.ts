import { containsPattern, normalizeSearch } from '../lib/search'
import { isValidSlug } from '../lib/slug'
import { supabase } from '../lib/supabase'
import type { Completion, Page, Player } from '../types/models'
import { toCompletion, toPlayer } from './mappers'
import {
  ensureOk,
  isUuid,
  pageWindow,
  readPage,
  run,
  withSignal,
  type RequestOptions,
} from './request'

export type GetPlayersParams = {
  /** Text the player name must contain (ignoring case). Under 2 characters → no filter. */
  search?: string
  /** 1-based. Default 1. */
  page?: number
  /** Default 25, at most 100. */
  pageSize?: number
}

/**
 * One page of the leaderboard: best rank first, players without completions (no rank) last,
 * then by name (and id, so paging is stable).
 */
export function getPlayers(
  params: GetPlayersParams = {},
  options: RequestOptions = {},
): Promise<Page<Player>> {
  const { signal } = options
  return run(async () => {
    const window = pageWindow(params.page, params.pageSize)
    const search = normalizeSearch(params.search ?? '')

    let query = supabase.from('players_view').select('*', { count: 'exact' })
    if (search !== '') query = query.ilike('name', containsPattern(search))
    query = query
      .order('rank', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .order('id', { ascending: true })

    const response = await withSignal(query.range(window.from, window.to), signal)
    const page = readPage(response, window, signal)
    return { rows: page.rows.map(toPlayer), total: page.total }
  }, signal)
}

/** The player with this slug, or null if there is none (an invalid slug isn't even looked up). */
export function getPlayerBySlug(
  slug: string,
  options: RequestOptions = {},
): Promise<Player | null> {
  const { signal } = options
  return run(async () => {
    if (!isValidSlug(slug)) return null
    const query = supabase.from('players_view').select('*').eq('slug', slug)
    const { data } = ensureOk(await withSignal(query, signal).maybeSingle(), signal)
    return data === null ? null : toPlayer(data)
  }, signal)
}

export const PLAYER_RECORD_SORTS = ['position', 'date'] as const

export type PlayerRecordSort = (typeof PLAYER_RECORD_SORTS)[number]

export function isPlayerRecordSort(value: unknown): value is PlayerRecordSort {
  return typeof value === 'string' && (PLAYER_RECORD_SORTS as readonly string[]).includes(value)
}

export type PlayerRecordsOptions = RequestOptions & {
  /**
   * 'position' (default): hardest level first (level_position ascending).
   * 'date': most recently beaten first (unknown dates last).
   */
  sort?: PlayerRecordSort
}

/** Every level the player has beaten, with the level's details. */
export function getPlayerRecords(
  playerId: string,
  options: PlayerRecordsOptions = {},
): Promise<Completion[]> {
  const { signal } = options
  return run(async () => {
    if (!isUuid(playerId)) return []
    let query = supabase.from('records_view').select('*').eq('player_id', playerId)
    if (options.sort === 'date') {
      query = query
        .order('date_beaten', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    } else {
      query = query.order('level_position', { ascending: true }).order('id', { ascending: true })
    }
    const { data } = ensureOk(await withSignal(query, signal), signal)
    return data.map(toCompletion)
  }, signal)
}
