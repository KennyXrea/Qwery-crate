import type { Page } from '../types/models'
import { ApiError, NOT_FOUND_MESSAGE, toApiError } from './errors'

/**
 * Helpers shared by the src/api modules: error handling, cancelling and paging.
 * Nothing outside src/api needs them, except src/hooks/queryKeys.ts, which uses the paging
 * clamps (pageWindow, clampInt) so its cache keys match the requests exactly.
 */

/** Every src/api function takes these as its last argument. */
export type RequestOptions = {
  /** Cancels the request when it fires. React Query passes one to every queryFn. */
  signal?: AbortSignal
}

/** The parts of a supabase-js response these helpers look at. */
type ResponseLike = { error: unknown; status: number }

/**
 * Runs an API function body and turns anything it throws into an ApiError, so callers only
 * ever see ApiErrors.
 */
export async function run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await task()
  } catch (error) {
    throw toApiError(error, { signal })
  }
}

/** The success case of a supabase-js response (R itself when R isn't a success/failure union). */
type Success<R> = [Extract<R, { error: null }>] extends [never] ? R : Extract<R, { error: null }>

/**
 * Throws an ApiError when the response has an error; otherwise returns it, typed as the
 * success case (so `data` is no longer `null` for list queries).
 */
export function ensureOk<R extends ResponseLike>(response: R, signal?: AbortSignal): Success<R> {
  if (response.error != null) {
    throw toApiError(response.error, { status: response.status, signal })
  }
  return response as Success<R>
}

/** Anything with supabase-js' abortSignal() method (every query and rpc builder has it). */
export type Abortable = { abortSignal(signal: AbortSignal): unknown }

/** Attaches the AbortSignal to a query, when there is one. */
export function withSignal<B extends Abortable>(builder: B, signal: AbortSignal | undefined): B {
  if (signal) builder.abortSignal(signal)
  return builder
}

// ── Paging ────────────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
/** Far beyond any real list; stops absurd ?page= values from becoming huge database offsets. */
export const MAX_PAGE = 10_000

/** A whole number between min and max; anything unreadable (NaN, Infinity, undefined) → fallback. */
export function clampInt(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export type PageWindow = { page: number; pageSize: number; from: number; to: number }

/**
 * Turns a 1-based page number and a page size into the row range to ask for
 * (`.range(from, to)`, both inclusive). Page and size are clamped to sensible values.
 */
export function pageWindow(
  page: number | undefined,
  pageSize: number | undefined,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): PageWindow {
  const size = clampInt(pageSize, 1, MAX_PAGE_SIZE, defaultPageSize)
  const current = clampInt(page, 1, MAX_PAGE, 1)
  const from = (current - 1) * size
  return { page: current, pageSize: size, from, to: from + size - 1 }
}

/** A list with no rows (a new object each time, so callers may change it). */
export function emptyPage<T>(): Page<T> {
  return { rows: [], total: 0 }
}

/** PostgREST's error for a page that starts after the last row (when counting rows). */
const RANGE_NOT_SATISFIABLE = 'PGRST103'

/**
 * Reads a `{ count: 'exact' }` + `.range()` response as one page of rows plus the total.
 * A page past the end of the list is not an error: PostgREST answers it with PGRST103
 * ("An offset of 50 was requested, but there are only 12 rows."), which becomes an empty page
 * with the real total, so the page can still show "page 3 of 1" style navigation back.
 */
export function readPage<Row>(
  response: { data: Row[] | null; error: unknown; count: number | null; status: number },
  window: PageWindow,
  signal?: AbortSignal,
): Page<Row> {
  const { error } = response
  if (error != null && typeof error === 'object' && 'code' in error) {
    if (error.code === RANGE_NOT_SATISFIABLE) {
      const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
      const total = /only (\d+) rows?/.exec(details)?.[1]
      if (total !== undefined) return { rows: [], total: Number(total) }
      throw new ApiError({
        kind: 'not_found',
        code: RANGE_NOT_SATISFIABLE,
        status: response.status,
        message: NOT_FOUND_MESSAGE,
        cause: error,
      })
    }
  }
  const { data, count } = ensureOk(response, signal)
  const rows = data ?? []
  return { rows, total: count ?? window.from + rows.length }
}

// ── Reading a whole table in chunks ───────────────────────────────────────────────────────────

/** Supabase's default "max rows" per request; a bigger range is silently cut to this. */
export const CHUNK_SIZE = 1000
const MAX_CHUNKS = 1000

/**
 * Reads every row of a query, CHUNK_SIZE rows at a time (Supabase never returns more than
 * "max rows" in one response). `makeQuery(from, to)` must build the query with
 * `{ count: 'exact' }` and a stable `.order()` and apply `.range(from, to)`.
 * Stops when it has `count` rows or a chunk comes back empty.
 */
export async function readAllRows<Row>(
  makeQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: unknown; count: number | null; status: number }>,
  signal?: AbortSignal,
): Promise<Row[]> {
  const rows: Row[] = []
  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    const from = rows.length
    const { data, count } = ensureOk(await makeQuery(from, from + CHUNK_SIZE - 1), signal)
    const received = data ?? []
    rows.push(...received)
    if (received.length === 0 || count === null || rows.length >= count) break
  }
  return rows
}

// ── Small checks ───────────────────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * True for an id in the form the database uses (e.g. from a ?player= link). The API functions
 * answer "nothing found" for anything else instead of sending it (Postgres would reject it).
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}
