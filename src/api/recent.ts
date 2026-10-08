import { supabase } from '../lib/supabase'
import type { Page, RecentChange, RecentChangeKind } from '../types/models'
import { toRecentChange } from './mappers'
import { pageWindow, readPage, run, withSignal, type RequestOptions } from './request'

// A Record, so TypeScript insists that every kind is listed (and nothing else).
const KINDS: Readonly<Record<RecentChangeKind, true>> = {
  record: true,
  level_added: true,
  level_moved: true,
}

/** The kinds of entry in the Recent changes feed (the page's filter chips). */
export const RECENT_CHANGE_KINDS: readonly RecentChangeKind[] = Object.freeze(
  Object.keys(KINDS) as RecentChangeKind[],
)

export function isRecentChangeKind(value: unknown): value is RecentChangeKind {
  return typeof value === 'string' && Object.hasOwn(KINDS, value)
}

export const RECENT_CHANGES_PAGE_SIZE = 30

export type GetRecentChangesParams = {
  /** Only this kind of entry; all kinds when left out (or not one of RECENT_CHANGE_KINDS). */
  kind?: RecentChangeKind
  /** 1-based. Default 1. */
  page?: number
  /** Default 30, at most 100. */
  pageSize?: number
}

/**
 * One page of the Recent changes feed, newest first: by the day it happened, then when it was
 * entered, then kind and id (rows saved together share a time, so those make paging stable).
 */
export function getRecentChanges(
  params: GetRecentChangesParams = {},
  options: RequestOptions = {},
): Promise<Page<RecentChange>> {
  const { signal } = options
  return run(async () => {
    const window = pageWindow(params.page, params.pageSize, RECENT_CHANGES_PAGE_SIZE)
    let query = supabase.from('recent_changes_view').select('*', { count: 'exact' })
    // An unknown kind (e.g. a hand-edited ?kind=) is ignored, like the list's unknown filters.
    if (isRecentChangeKind(params.kind)) query = query.eq('kind', params.kind)
    query = query
      .order('event_date', { ascending: false })
      .order('happened_at', { ascending: false })
      .order('kind', { ascending: true })
      .order('id', { ascending: true })

    const response = await withSignal(query.range(window.from, window.to), signal)
    const page = readPage(response, window, signal)
    return { rows: page.rows.map(toRecentChange), total: page.total }
  }, signal)
}
