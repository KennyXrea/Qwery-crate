/**
 * Helpers behind the Recent changes page (/recent): reading its URL, the filter chips, and
 * grouping the feed into days ("Today", "Yesterday", then dates). Kept out of RecentPage.tsx so
 * that file only exports components.
 */
import { useEffect, useState } from 'react'
import { isRecentChangeKind, RECENT_CHANGES_PAGE_SIZE } from '../api/recent'
import { formatCount, formatNumber } from '../lib/format'
import { RECENT_KIND_PARAM } from '../lib/paths'
import type { RecentChange, RecentChangeKind } from '../types/models'

// ── The URL: ?kind=record|level_added|level_moved&page=N ──────────────────────────────────────

/** The query parameter of /recent that holds the page number (1-based; left out for page 1). */
export const RECENT_PAGE_PARAM = 'page'

/** Changes per page (30, the API's own page size). */
export const RECENT_PAGE_SIZE = RECENT_CHANGES_PAGE_SIZE

/** Far beyond any real feed; the API clamps to the same limit. */
const MAX_PAGE = 10_000

export type RecentFeedParams = {
  /** null = every kind (the "All" chip), also for a missing or unknown ?kind=. */
  kind: RecentChangeKind | null
  page: number
}

/** A ?page= value → a page number ≥ 1. Anything that isn't a plain whole number → 1. */
export function parsePageParam(value: string | null): number {
  const text = value?.trim() ?? ''
  if (!/^\d{1,9}$/.test(text)) return 1
  const page = Number(text)
  return page < 1 ? 1 : Math.min(page, MAX_PAGE)
}

/** Reads the filter and page of /recent from its query string. */
export function readRecentParams(searchParams: URLSearchParams): RecentFeedParams {
  const kind = searchParams.get(RECENT_KIND_PARAM)
  return {
    kind: isRecentChangeKind(kind) ? kind : null,
    page: parsePageParam(searchParams.get(RECENT_PAGE_PARAM)),
  }
}

/** The same query string with another page (page 1 drops the parameter). Other params stay. */
export function withPage(searchParams: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  if (page <= 1) next.delete(RECENT_PAGE_PARAM)
  else next.set(RECENT_PAGE_PARAM, String(Math.floor(page)))
  return next
}

/** How many pages `total` rows fill (always at least 1). */
export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 1
  return Math.ceil(total / pageSize)
}

// ── Filter chips ──────────────────────────────────────────────────────────────────────────────

export type RecentFilter = {
  /** null = all kinds. */
  kind: RecentChangeKind | null
  /** The chip's text. */
  label: string
  /** "1 completion" / "12 completions" in the summary line. */
  singular: string
  plural: string
}

/** The filter chips, in the order they are shown. */
export const RECENT_FILTERS: readonly RecentFilter[] = [
  { kind: null, label: 'All', singular: 'change', plural: 'changes' },
  { kind: 'record', label: 'Completions', singular: 'completion', plural: 'completions' },
  { kind: 'level_added', label: 'New levels', singular: 'new level', plural: 'new levels' },
  { kind: 'level_moved', label: 'Moves', singular: 'move', plural: 'moves' },
]

/** The chip for a kind (the "All" chip for null). */
export function recentFilterOf(kind: RecentChangeKind | null): RecentFilter {
  return (
    RECENT_FILTERS.find((filter) => filter.kind === kind) ?? (RECENT_FILTERS[0] as RecentFilter)
  )
}

/**
 * The line above the feed: "5 changes" when everything fits on one page, otherwise
 * "Showing 31–57 of 57 changes".
 */
export function feedSummary(
  filter: RecentFilter,
  page: number,
  pageSize: number,
  shown: number,
  total: number,
): string {
  const count = formatCount(total, filter.singular, filter.plural)
  if (page <= 1 && shown >= total) return count
  const from = (page - 1) * pageSize + 1
  const to = from + shown - 1
  return `Showing ${formatNumber(from)}–${formatNumber(to)} of ${count}`
}

// ── Days ──────────────────────────────────────────────────────────────────────────────────────

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The calendar day of `date` in the VIEWER'S OWN time zone, as 'YYYY-MM-DD' (the same shape as
 * event_date). Never toISOString(): that is the UTC day, which is already tomorrow in the
 * evening in the Americas.
 */
export function localDayKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 'YYYY-MM-DD' → the calendar day before it ('2026-03-01' → '2026-02-28'); bad input → null. */
export function previousDayKey(dayKey: string): string | null {
  const day = calendarDay(dayKey)
  if (!day) return null
  day.setUTCDate(day.getUTCDate() - 1)
  const year = String(day.getUTCFullYear()).padStart(4, '0')
  const month = String(day.getUTCMonth() + 1).padStart(2, '0')
  const date = String(day.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

/**
 * A date-only string as that calendar day at midnight UTC, only for formatting it with
 * timeZone 'UTC' (so the day can't shift). Impossible dates (Feb 30) → null.
 */
function calendarDay(value: string): Date | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  const same =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return year >= 1 && same ? date : null
}

const fullDayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export type DayHeading = {
  /** "Today", "Yesterday" or the full date ("Wednesday, Sep 2, 2026"). */
  label: string
  /** The full date next to "Today" / "Yesterday"; null when the label already is the date. */
  detail: string | null
}

/**
 * The heading of one day in the feed. `day` is an event_date ('YYYY-MM-DD', a calendar day with
 * no time zone) and `today` the viewer's local day (localDayKey / useLocalToday).
 * Days after today (an entry's UTC day can be ahead of the viewer's) just show their date.
 */
export function dayHeading(day: string, today: string): DayHeading {
  const date = calendarDay(day)
  if (!date) return { label: 'Unknown date', detail: null }
  const full = fullDayFormat.format(date)
  if (day === today) return { label: 'Today', detail: full }
  if (day === previousDayKey(today)) return { label: 'Yesterday', detail: full }
  return { label: full, detail: null }
}

export type RecentDayGroup = {
  /** The event_date shared by every change in the group. */
  day: string
  changes: RecentChange[]
}

/**
 * Splits the feed (already newest day first) into runs of the same event_date, keeping the
 * server's order inside each day.
 */
export function groupChangesByDay(changes: readonly RecentChange[]): RecentDayGroup[] {
  const groups: RecentDayGroup[] = []
  for (const change of changes) {
    const last = groups.at(-1)
    if (last && last.day === change.event_date) last.changes.push(change)
    else groups.push({ day: change.event_date, changes: [change] })
  }
  return groups
}

/**
 * The viewer's local day ('YYYY-MM-DD'). It moves on by itself at local midnight, and is checked
 * again whenever the tab becomes visible (timers are paused in background tabs).
 */
export function useLocalToday(): string {
  const [today, setToday] = useState(() => localDayKey(new Date()))

  useEffect(() => {
    const refresh = () => setToday(localDayKey(new Date()))
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    // A second late, so the new day has surely begun.
    const timer = window.setTimeout(refresh, nextMidnight.getTime() - now.getTime() + 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [today])

  return today
}
