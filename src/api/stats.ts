import { DIFFICULTIES } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { DifficultyCount, Level, MonthCount, SiteStats } from '../types/models'
import { toLevel } from './mappers'
import {
  ensureOk,
  readAllRows,
  run,
  withSignal,
  type Abortable,
  type RequestOptions,
} from './request'

/** How many levels the "most enjoyed" and "most attempts" lists show. */
export const TOP_LEVELS = 5

/**
 * Longest stretch of months completionsPerMonth fills with zeros (100 years). A typo in a date
 * (year 0202 instead of 2026) would otherwise make thousands of empty months.
 */
export const MAX_FILLED_MONTHS = 1200

const DATE_ONLY = /^(\d{4})-(\d{2})-\d{2}$/

function monthLabel(index: number): string {
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/**
 * Counts completions per calendar month from their date_beaten values ('YYYY-MM-DD').
 * Months run oldest first, and months in between without any completion are included with a
 * count of 0 (unless that would be more than MAX_FILLED_MONTHS months; then only months with
 * completions are listed). Missing (or unreadable) dates are counted in `undated` instead.
 */
export function countCompletionsPerMonth(dates: Iterable<string | null>): {
  months: MonthCount[]
  undated: number
} {
  const counts = new Map<number, number>()
  let undated = 0
  for (const date of dates) {
    const match = date === null ? null : DATE_ONLY.exec(date)
    if (!match) {
      undated++
      continue
    }
    const index = Number(match[1]) * 12 + Number(match[2]) - 1
    counts.set(index, (counts.get(index) ?? 0) + 1)
  }
  if (counts.size === 0) return { months: [], undated }

  const present = [...counts.keys()].sort((a, b) => a - b)
  const first = present[0] ?? 0
  const last = present[present.length - 1] ?? 0
  const indexes =
    last - first + 1 <= MAX_FILLED_MONTHS
      ? Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
      : present
  const months = indexes.map((index) => ({
    month: monthLabel(index),
    count: counts.get(index) ?? 0,
  }))
  return { months, undated }
}

/** Levels per difficulty, for all 11 difficulties in DIFFICULTIES order (easiest first). */
export function countDifficulties(difficulties: Iterable<string>): DifficultyCount[] {
  const counts = new Map<string, number>()
  for (const difficulty of difficulties) counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1)
  return DIFFICULTIES.map((difficulty) => ({ difficulty, count: counts.get(difficulty) ?? 0 }))
}

type CountResponse = { count: number | null; error: unknown; status: number }

/**
 * The numbers for the Stats page and the home page's stats strip. Counts use count-only
 * requests; the rest reads only the few columns it needs (all rows, in chunks).
 */
export function getSiteStats(options: RequestOptions = {}): Promise<SiteStats> {
  const { signal } = options
  return run(async () => {
    const headCount = async (query: PromiseLike<CountResponse> & Abortable) => {
      const { count } = ensureOk(await withSignal(query, signal), signal)
      return count ?? 0
    }

    const topLevels = async (column: 'avg_enjoyment' | 'avg_attempts'): Promise<Level[]> => {
      const query = supabase
        .from('levels_view')
        .select('*')
        .not(column, 'is', null)
        .order(column, { ascending: false, nullsFirst: false })
        .order('position', { ascending: true })
        .order('id', { ascending: true })
        .limit(TOP_LEVELS)
      const { data } = ensureOk(await withSignal(query, signal), signal)
      return data.map(toLevel)
    }

    const [levels, players, records, levelRows, recordRows, mostEnjoyed, mostAttempts] =
      await Promise.all([
        headCount(supabase.from('levels').select('id', { count: 'exact', head: true })),
        headCount(supabase.from('players').select('id', { count: 'exact', head: true })),
        headCount(supabase.from('records').select('id', { count: 'exact', head: true })),
        readAllRows(
          (from, to) =>
            withSignal(
              supabase
                .from('levels')
                .select('difficulty', { count: 'exact' })
                .order('id', { ascending: true })
                .range(from, to),
              signal,
            ),
          signal,
        ),
        readAllRows(
          (from, to) =>
            withSignal(
              supabase
                .from('records')
                .select('attempts, date_beaten', { count: 'exact' })
                .order('id', { ascending: true })
                .range(from, to),
              signal,
            ),
          signal,
        ),
        topLevels('avg_enjoyment'),
        topLevels('avg_attempts'),
      ])

    let totalAttempts = 0
    for (const row of recordRows) {
      if (typeof row.attempts === 'number' && Number.isFinite(row.attempts)) {
        totalAttempts += row.attempts
      }
    }
    const perMonth = countCompletionsPerMonth(recordRows.map((row) => row.date_beaten))

    return {
      levels,
      players,
      records,
      totalAttempts,
      difficultyDistribution: countDifficulties(levelRows.map((row) => row.difficulty)),
      completionsPerMonth: perMonth.months,
      undatedCompletions: perMonth.undated,
      mostEnjoyed,
      mostAttempts,
    }
  }, signal)
}
