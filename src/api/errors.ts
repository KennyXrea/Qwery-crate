import { isAuthError, isAuthSessionMissingError } from '@supabase/supabase-js'

/**
 * One error type for everything that can go wrong talking to Supabase.
 *
 * Every function in src/api throws an ApiError (never a raw Supabase error), so pages can show
 * `error.message` directly — it is always a friendly sentence — and decide what to do from
 * `error.kind`:
 *   network         the request didn't get through (offline, server busy, cancelled, timed out)
 *   not_found       the thing doesn't exist (any more)
 *   not_authorized  not allowed: not logged in, not an admin, or the session expired
 *   conflict        clashes with existing data (duplicate name/slug, a level deleted meanwhile …)
 *   validation      a value was refused (empty name, enjoyment above 10, malformed id …)
 *   unknown         anything else
 * `code` keeps the original code (Postgres '23505', PostgREST 'PGRST116', Auth
 * 'invalid_credentials' …) and `cause` the original error, for the console and debugging.
 */

export const API_ERROR_KINDS = [
  'network',
  'not_found',
  'not_authorized',
  'conflict',
  'validation',
  'unknown',
] as const

export type ApiErrorKind = (typeof API_ERROR_KINDS)[number]

export const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again."
export const SERVER_BUSY_MESSAGE =
  'The server is busy or temporarily unavailable. Try again in a moment.'
export const TIMEOUT_MESSAGE = 'The server took too long to answer. Try again in a moment.'
export const ABORTED_MESSAGE = 'The request was cancelled.'
export const NOT_AUTHORIZED_MESSAGE = "You're not authorized — are you still logged in?"
export const SESSION_EXPIRED_MESSAGE = 'Your login has expired. Please log in again.'
export const NOT_FOUND_MESSAGE = "We couldn't find that. It may have been deleted."
export const VALIDATION_MESSAGE = "Some of the values aren't allowed. Check them and try again."
export const UNEXPECTED_DATA_MESSAGE =
  'The server sent data the site did not expect. Try again in a moment.'
export const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.'

/** `code` of an ApiError for a request that was cancelled (e.g. React Query aborted it). */
export const ABORTED_CODE = 'aborted'
/** `code` of an ApiError for a request that timed out. */
export const TIMEOUT_CODE = 'timeout'
/** `code` of an ApiError for a fetch that never reached the server. */
export const NETWORK_CODE = 'network'
/** `code` of an ApiError thrown when a row the database sent is missing a required value. */
export const UNEXPECTED_DATA_CODE = 'unexpected_data'

export type ApiErrorOptions = {
  kind: ApiErrorKind
  /** Friendly message shown to people. */
  message: string
  code?: string | null
  /** HTTP status, when known (0 = no response). */
  status?: number | null
  /** The database constraint involved, e.g. 'levels_slug_key' (forms use it to pick a field). */
  constraint?: string | null
  /** True when the login session expired or its token is no longer valid. */
  sessionExpired?: boolean
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly code: string | null
  readonly status: number | null
  readonly constraint: string | null
  readonly sessionExpired: boolean

  constructor(options: ApiErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ApiError'
    this.kind = options.kind
    this.code = options.code ?? null
    this.status = options.status ?? null
    this.constraint = options.constraint ?? null
    this.sessionExpired = options.sessionExpired ?? false
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export type ToApiErrorContext = {
  /** HTTP status of the response the error came with (supabase-js gives 0 for network errors). */
  status?: number | null
  /** The request's AbortSignal: if it fired, the error is reported as "cancelled". */
  signal?: AbortSignal
}

// ── Small readers for unknown values ───────────────────────────────────────────────────────────

type Fields = { [key: string]: unknown }

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// ── Recognising the kind of failure ────────────────────────────────────────────────────────────

/**
 * How browsers and Node word "the fetch never reached the server":
 * Chrome "Failed to fetch", Firefox "NetworkError when attempting to fetch resource.",
 * Safari "Load failed", Node "fetch failed", React Native "Network request failed".
 */
const NETWORK_FAILURE =
  /failed to fetch|networkerror|load failed|fetch failed|network request failed/i

/** supabase-js turns a thrown fetch error into { message: 'TypeError: Failed to fetch', … }. */
const FETCH_ERROR_PREFIX = /^(?:TypeError|FetchError|Error):/

const ABORT_HINT = /request was aborted/i

function isAbort(error: unknown): boolean {
  if (!isObject(error)) return false
  if (error.name === 'AbortError' || error.code === 'ABORT_ERR') return true
  // The PostgREST client reports an aborted fetch as a plain object.
  return /^AbortError\b/.test(text(error.message)) || ABORT_HINT.test(text(error.hint))
}

function isTimeout(error: unknown): boolean {
  if (!isObject(error)) return false
  return error.name === 'TimeoutError' || /^TimeoutError\b/.test(text(error.message))
}

/** A fetch that failed before any answer arrived (a TypeError, as the fetch standard says). */
function isFetchFailure(error: unknown, status: number | null): boolean {
  if (!isObject(error)) return false
  const message = text(error.message)
  if (error instanceof TypeError) return NETWORK_FAILURE.test(message)
  // A PostgREST-style error object: no code, and status 0 or the fetch error's wording.
  if (text(error.code) !== '') return false
  return (status === 0 && FETCH_ERROR_PREFIX.test(message)) || NETWORK_FAILURE.test(message)
}

/** Gateway / proxy statuses that mean "the server is unavailable right now". */
function isServerUnavailableStatus(status: number | null): boolean {
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (status !== null && status >= 520 && status <= 524)
  )
}

/**
 * A login token that expired or is no longer valid: "JWT expired" (PostgREST, the API gateway),
 * "jwt expired" / '"exp" claim timestamp check failed' (Storage), "invalid JWT".
 */
const JWT_PROBLEM =
  /\bjwt\b.*\b(?:expired|invalid|malformed)\b|invalid jwt|"?exp"? claim timestamp/i

// ── Postgres / PostgREST errors ────────────────────────────────────────────────────────────────

type ErrorParts = { code: string; message: string; details: string; hint: string }

function constraintName(message: string): string | null {
  return /constraint "([^"]+)"/.exec(message)?.[1] ?? null
}

/** Article + noun for the table a constraint belongs to ('levels_slug_key' → 'level'). */
const TABLE_NOUNS: ReadonlyArray<[prefix: string, noun: string]> = [
  ['level_position_history_', 'history entry'],
  ['site_settings_', 'setting'],
  ['levels_', 'level'],
  ['players_', 'player'],
  ['records_', 'record'],
]

function nounFor(name: string | null): string | null {
  if (!name) return null
  return TABLE_NOUNS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? null
}

/** Readable names for the columns that have unique constraints or appear in error details. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  slug: 'slug',
  name: 'name',
  'lower(name)': 'name',
  gd_level_id: 'GD ID',
  position: 'position',
}

/** 'Key (lower(name))=(alpha) already exists.' → 'lower(name)'. */
function keyColumns(details: string): string | null {
  return /^Key \((.+?)\)=/.exec(details)?.[1] ?? null
}

/** 23505 unique_violation → "A level with that slug already exists." */
function describeUniqueViolation(parts: ErrorParts, constraint: string | null): string {
  if (constraint === 'records_level_player_key') {
    return 'This player already has a record for this level.'
  }
  if (constraint === 'levels_position_key') {
    return 'Another level already has that position. Refresh the page and try again.'
  }
  const columns = keyColumns(parts.details)
  let field = columns ? (FIELD_LABELS[columns] ?? null) : null
  if (!field && constraint) {
    // levels_gd_level_id_key → gd_level_id; players_name_lower_key → name
    const column = Object.keys(FIELD_LABELS).find(
      (key) => constraint.endsWith(`_${key}_key`) || constraint.endsWith(`_${key}_lower_key`),
    )
    field = column ? (FIELD_LABELS[column] ?? null) : null
  }
  const noun = nounFor(constraint)
  if (noun && field) return `A ${noun} with that ${field} already exists.`
  if (noun) return `That ${noun} already exists.`
  return 'Something with that value already exists.'
}

/** 23503 foreign_key_violation. */
function describeForeignKeyViolation(parts: ErrorParts): string {
  // Deleting something others still point to: 'Key (id)=(…) is still referenced from table "records".'
  if (/still referenced/i.test(parts.details) || /^update or delete/i.test(parts.message)) {
    return "This is still used elsewhere, so it can't be removed."
  }
  // Pointing at something that's gone: 'Key (level_id)=(…) is not present in table "levels".'
  const column = keyColumns(parts.details) ?? ''
  if (column === 'level_id') {
    return 'That level no longer exists. It may have been deleted — refresh the page and try again.'
  }
  if (column === 'player_id') {
    return 'That player no longer exists. They may have been deleted — refresh the page and try again.'
  }
  return 'This refers to something that no longer exists. Refresh the page and try again.'
}

/** The message raised by the levels_positions_contiguous trigger (code 23514). */
const RANKING_GAP = /positions must be 1, 2, 3/i

/** Friendly text for each check constraint in supabase/migrations/…_schema.sql. */
const CHECK_MESSAGES: Readonly<Record<string, string>> = {
  levels_position_check: 'The position must be 1 or higher.',
  levels_name_check: "The level name can't be empty.",
  levels_slug_check:
    'The slug may only contain lowercase letters, numbers and single hyphens (like "my-level-2").',
  levels_gd_level_id_check: 'The GD level ID must be a positive number.',
  levels_difficulty_rating_check: 'The difficulty rating must be between 0 and 100.',
  levels_points_override_check: "The points override can't be negative.",
  levels_length_seconds_check: 'The length must be more than 0 seconds.',
  levels_showcase_video_url_check: 'The video link must start with http:// or https://.',
  players_name_check: "The player name can't be empty.",
  players_slug_check:
    'The slug may only contain lowercase letters, numbers and single hyphens (like "player-2").',
  players_country_code_check: 'The country code must be two capital letters, like US.',
  players_channel_url_check: 'The channel link must start with http:// or https://.',
  records_attempts_check: 'Attempts must be 1 or more.',
  records_enjoyment_check: 'Enjoyment must be between 0 and 10.',
  records_video_url_check: 'The video link must start with http:// or https://.',
  site_settings_site_name_check: "The site name can't be empty.",
  site_settings_main_list_size_check: 'The main list size must be between 1 and 10000.',
  site_settings_extended_list_size_check: 'The extended list size must be between 0 and 10000.',
  site_settings_points_max_check: 'The points for #1 must be more than 0.',
  site_settings_points_decay_check: 'The decay must be more than 0 and at most 1.',
  site_settings_points_min_check: 'The minimum points must be between 0 and the points for #1.',
}

function describeCheckViolation(parts: ErrorParts, constraint: string | null): string {
  if (RANKING_GAP.test(parts.message)) {
    return 'The ranking must stay #1, #2, #3 … with no gaps. Change positions with the move tools instead of editing them directly.'
  }
  return (constraint ? CHECK_MESSAGES[constraint] : undefined) ?? VALIDATION_MESSAGE
}

/** Postgres "data exception" codes (class 22) → message. */
const DATA_EXCEPTION_MESSAGES: Readonly<Record<string, string>> = {
  '22P02': 'Some of the values have the wrong format.',
  '22004': 'Some required values are missing.',
  '22023': VALIDATION_MESSAGE,
  '22001': 'Some of the text is too long.',
  '22003': 'A number is too big or too small.',
  '22007': "A date isn't valid.",
  '22008': "A date isn't valid.",
}

function fromPostgres(parts: ErrorParts, status: number | null, cause: unknown): ApiError {
  const { code, message } = parts
  const constraint = constraintName(message)
  const base = { code, status, cause, constraint }

  // Login session problems first: PostgREST's JWT errors, or a gateway "JWT expired".
  if (code === 'PGRST301' || code === 'PGRST303' || JWT_PROBLEM.test(message)) {
    return new ApiError({
      ...base,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    })
  }

  switch (code) {
    case '23505':
      return new ApiError({
        ...base,
        kind: 'conflict',
        message: describeUniqueViolation(parts, constraint),
      })
    case '23503':
      return new ApiError({
        ...base,
        kind: 'conflict',
        message: describeForeignKeyViolation(parts),
      })
    case '23514':
      return new ApiError({
        ...base,
        kind: 'validation',
        message: describeCheckViolation(parts, constraint),
      })
    case '23502':
      return new ApiError({ ...base, kind: 'validation', message: 'A required value is missing.' })
    case '42501':
    case 'PGRST302':
      return new ApiError({ ...base, kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
    case 'P0002':
      return new ApiError({
        ...base,
        kind: 'not_found',
        message: /level/i.test(message)
          ? 'That level no longer exists. It may have been deleted.'
          : NOT_FOUND_MESSAGE,
      })
    case 'PGRST116':
    case 'PGRST103':
      return new ApiError({ ...base, kind: 'not_found', message: NOT_FOUND_MESSAGE })
    case '40001':
    case '40P01':
      return new ApiError({
        ...base,
        kind: 'conflict',
        message: 'Someone else changed this at the same moment. Please try again.',
      })
    case '57014':
      return new ApiError({ ...base, kind: 'network', message: TIMEOUT_MESSAGE })
    case 'PGRST000':
    case 'PGRST001':
    case 'PGRST002':
    case 'PGRST003':
      return new ApiError({ ...base, kind: 'network', message: SERVER_BUSY_MESSAGE })
  }

  if (code.startsWith('22')) {
    return new ApiError({
      ...base,
      kind: 'validation',
      message: DATA_EXCEPTION_MESSAGES[code] ?? VALIDATION_MESSAGE,
    })
  }
  // Row level security refusals sometimes arrive without the 42501 code (e.g. from Storage).
  if (/row-level security|permission denied/i.test(message)) {
    return new ApiError({ ...base, kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
  }
  if (status === 401 || status === 403) {
    return new ApiError({ ...base, kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
  }
  if (isServerUnavailableStatus(status)) {
    return new ApiError({ ...base, kind: 'network', message: SERVER_BUSY_MESSAGE })
  }
  if (status === 429) {
    return new ApiError({
      ...base,
      kind: 'unknown',
      message: 'Too many requests. Wait a moment and try again.',
    })
  }
  return new ApiError({ ...base, kind: 'unknown', message: UNKNOWN_MESSAGE })
}

// ── Supabase Auth errors ───────────────────────────────────────────────────────────────────────

/** Auth error codes that mean "your login is no longer valid". */
const AUTH_SESSION_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
])

function fromAuth(error: Error & { status?: number; code?: string }): ApiError {
  const code = error.code ?? null
  const status = numberOrNull(error.status)
  const base = { code, status, cause: error }

  if (error.name === 'AuthRetryableFetchError' || status === 0) {
    return new ApiError({ ...base, kind: 'network', message: NETWORK_MESSAGE })
  }
  if (isAuthSessionMissingError(error) || (code !== null && AUTH_SESSION_CODES.has(code))) {
    return new ApiError({
      ...base,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    })
  }
  switch (code) {
    case 'invalid_credentials':
      return new ApiError({
        ...base,
        kind: 'not_authorized',
        message: 'Invalid email or password.',
      })
    case 'email_not_confirmed':
      return new ApiError({
        ...base,
        kind: 'not_authorized',
        message: 'This email address has not been confirmed yet.',
      })
    case 'user_banned':
    case 'signup_disabled':
    case 'email_provider_disabled':
      return new ApiError({ ...base, kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
    case 'weak_password':
      return new ApiError({
        ...base,
        kind: 'validation',
        message: 'That password is too weak. Use a longer one with a mix of characters.',
      })
    case 'same_password':
      return new ApiError({
        ...base,
        kind: 'validation',
        message: 'The new password must be different from the old one.',
      })
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new ApiError({
        ...base,
        kind: 'unknown',
        message: 'Too many attempts. Wait a few minutes and try again.',
      })
  }
  if (status === 429) {
    return new ApiError({
      ...base,
      kind: 'unknown',
      message: 'Too many attempts. Wait a few minutes and try again.',
    })
  }
  if (isServerUnavailableStatus(status)) {
    return new ApiError({ ...base, kind: 'network', message: SERVER_BUSY_MESSAGE })
  }
  return new ApiError({ ...base, kind: 'unknown', message: UNKNOWN_MESSAGE })
}

// ── Supabase Storage errors ────────────────────────────────────────────────────────────────────

/** storage-js marks its errors with __isStorageError (StorageApiError / StorageUnknownError). */
function isStorageError(error: unknown): error is Error & Fields {
  return error instanceof Error && (error as Error & Fields).__isStorageError === true
}

function fromStorage(error: Error & Fields): ApiError {
  const message = text(error.message)
  // StorageApiError has statusCode as text ('403'); StorageUnknownError has the fetch error.
  const statusCode = text(error.statusCode) || String(numberOrNull(error.status) ?? '')
  const status = numberOrNull(error.status) ?? (Number(statusCode) || null)
  const base = { code: statusCode || null, status, cause: error }

  if (isFetchFailure(error.originalError, 0) || isFetchFailure(error, null)) {
    return new ApiError({ ...base, code: NETWORK_CODE, kind: 'network', message: NETWORK_MESSAGE })
  }
  if (JWT_PROBLEM.test(message)) {
    return new ApiError({
      ...base,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    })
  }
  if (/row-level security|unauthorized|permission denied/i.test(message) || statusCode === '403') {
    return new ApiError({ ...base, kind: 'not_authorized', message: NOT_AUTHORIZED_MESSAGE })
  }
  if (statusCode === '404' || /not found/i.test(message)) {
    return new ApiError({ ...base, kind: 'not_found', message: 'That file no longer exists.' })
  }
  if (statusCode === '409' || /already exists|duplicate/i.test(message)) {
    return new ApiError({
      ...base,
      kind: 'conflict',
      message: 'A file with that name already exists.',
    })
  }
  if (statusCode === '413' || /maximum allowed size|too large/i.test(message)) {
    return new ApiError({
      ...base,
      kind: 'validation',
      message: 'That image is too big. The limit is 2 MB.',
    })
  }
  if (statusCode === '415' || /mime type/i.test(message)) {
    return new ApiError({
      ...base,
      kind: 'validation',
      message: "That file type isn't allowed. Use a PNG, JPEG or WebP image.",
    })
  }
  if (isServerUnavailableStatus(status)) {
    return new ApiError({ ...base, kind: 'network', message: SERVER_BUSY_MESSAGE })
  }
  return new ApiError({ ...base, kind: 'unknown', message: UNKNOWN_MESSAGE })
}

// ── The one entry point ────────────────────────────────────────────────────────────────────────

/** How many wrapped errors (error.cause.cause …) toApiError looks through. */
const MAX_CAUSE_DEPTH = 5

/**
 * Turns anything that was thrown or returned as an error into an ApiError with a friendly
 * message: a PostgrestError (or the plain `{ code, message, details, hint }` object supabase-js
 * returns), an AuthError, a StorageError, a fetch TypeError, an AbortError, or anything else.
 * An ApiError is returned unchanged. When the error itself isn't recognised but wraps one that
 * is (`new Error('…', { cause })`), the wrapped one decides (the ApiError's cause stays `error`).
 * It never throws: src/api's run() relies on always getting an ApiError back.
 */
export function toApiError(error: unknown, context: ToApiErrorContext = {}): ApiError {
  try {
    if (error instanceof ApiError) return error
    const result = classify(error, context)
    if (result.kind !== 'unknown') return result
    return classifyCause(error) ?? result
  } catch {
    // Merely reading the value threw (a throwing getter, a revoked Proxy …).
    return new ApiError({ kind: 'unknown', message: UNKNOWN_MESSAGE, cause: error })
  }
}

/** The first recognised error in error.cause, error.cause.cause … (loops and depth limited). */
function classifyCause(error: unknown): ApiError | null {
  const seen = new Set<unknown>([error])
  let current = error
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (!isObject(current)) return null
    current = current.cause
    if (!isObject(current) || seen.has(current)) return null
    seen.add(current)
    const inner = current instanceof ApiError ? current : classify(current, {})
    if (inner.kind !== 'unknown') {
      return new ApiError({
        kind: inner.kind,
        message: inner.message,
        code: inner.code,
        status: inner.status,
        constraint: inner.constraint,
        sessionExpired: inner.sessionExpired,
        cause: error,
      })
    }
  }
  return null
}

/** toApiError without the ApiError / cause / never-throw handling. */
function classify(error: unknown, context: ToApiErrorContext): ApiError {
  const status = context.status ?? (isObject(error) ? numberOrNull(error.status) : null)

  if (isTimeout(error)) {
    return new ApiError({
      kind: 'network',
      code: TIMEOUT_CODE,
      status,
      message: TIMEOUT_MESSAGE,
      cause: error,
    })
  }
  if (context.signal?.aborted || isAbort(error)) {
    return new ApiError({
      kind: 'network',
      code: ABORTED_CODE,
      status,
      message: ABORTED_MESSAGE,
      cause: error,
    })
  }
  if (isAuthError(error)) return fromAuth(error)
  if (isStorageError(error)) return fromStorage(error)
  if (isFetchFailure(error, status)) {
    return new ApiError({
      kind: 'network',
      code: NETWORK_CODE,
      status,
      message: NETWORK_MESSAGE,
      cause: error,
    })
  }
  // PostgREST errors ({ code, message, details, hint }), a gateway's { message } without a
  // code, or any other Error: read by code first, then by wording and HTTP status.
  if (isObject(error) && typeof error.message === 'string') {
    const parts: ErrorParts = {
      code: text(error.code),
      message: error.message,
      details: text(error.details),
      hint: text(error.hint),
    }
    return fromPostgres(parts, status, error)
  }
  if (status !== null && isServerUnavailableStatus(status)) {
    return new ApiError({ kind: 'network', status, message: SERVER_BUSY_MESSAGE, cause: error })
  }
  return new ApiError({ kind: 'unknown', status, message: UNKNOWN_MESSAGE, cause: error })
}

/**
 * True when the error means the admin's login session expired (or its token is no longer
 * valid), so the site should ask them to log in again. Phase 5 uses this to show a toast and
 * redirect to /admin/login. (A plain "not allowed" — kind 'not_authorized' without this flag —
 * means the request was made without a valid admin login; check the session for that case.)
 */
export function isSessionExpiredError(error: unknown): boolean {
  return toApiError(error).sessionExpired
}

/** True when the request was cancelled on purpose (React Query cancels queries it no longer needs). */
export function isAbortError(error: unknown): boolean {
  return toApiError(error).code === ABORTED_CODE
}
