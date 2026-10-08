import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthWeakPasswordError,
  PostgrestError,
  StorageApiError,
} from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  ABORTED_CODE,
  ABORTED_MESSAGE,
  ApiError,
  isAbortError,
  isApiError,
  isSessionExpiredError,
  NETWORK_MESSAGE,
  NOT_AUTHORIZED_MESSAGE,
  NOT_FOUND_MESSAGE,
  SERVER_BUSY_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  TIMEOUT_CODE,
  TIMEOUT_MESSAGE,
  toApiError,
  UNKNOWN_MESSAGE,
  VALIDATION_MESSAGE,
  type ApiErrorKind,
} from '../api/errors'
import { postgrestError } from './api-fixtures'

describe('ApiError', () => {
  it('is an Error with a kind, code, status, constraint, cause and a friendly message', () => {
    const cause = new Error('original')
    const error = new ApiError({
      kind: 'conflict',
      code: '23505',
      status: 409,
      constraint: 'levels_slug_key',
      message: 'A level with that slug already exists.',
      cause,
    })
    expect(error).toBeInstanceOf(Error)
    expect(isApiError(error)).toBe(true)
    expect(error.name).toBe('ApiError')
    expect(error).toMatchObject({
      kind: 'conflict',
      code: '23505',
      status: 409,
      constraint: 'levels_slug_key',
      sessionExpired: false,
      message: 'A level with that slug already exists.',
    })
    expect(error.cause).toBe(cause)
  })

  it('defaults the optional fields to null / false', () => {
    const error = new ApiError({ kind: 'unknown', message: 'x' })
    expect(error).toMatchObject({
      code: null,
      status: null,
      constraint: null,
      sessionExpired: false,
    })
    expect(error.cause).toBeUndefined()
  })
})

type Case = {
  name: string
  error: unknown
  status?: number
  kind: ApiErrorKind
  message: string | RegExp
  sessionExpired?: boolean
  constraint?: string | null
}

function check({ error, status, kind, message, sessionExpired = false, constraint }: Case) {
  const result = toApiError(error, status === undefined ? {} : { status })
  expect(result).toBeInstanceOf(ApiError)
  expect(result.kind).toBe(kind)
  if (typeof message === 'string') expect(result.message).toBe(message)
  else expect(result.message).toMatch(message)
  expect(result.sessionExpired).toBe(sessionExpired)
  if (constraint !== undefined) expect(result.constraint).toBe(constraint)
  expect(result.cause).toBe(error)
}

describe('toApiError: Postgres / PostgREST codes', () => {
  const cases: Case[] = [
    // 23505 unique_violation → conflict, naming the field when possible
    {
      name: '23505 level slug',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "levels_slug_key"',
        'Key (slug)=(sample-level-1) already exists.',
      ),
      status: 409,
      kind: 'conflict',
      message: 'A level with that slug already exists.',
      constraint: 'levels_slug_key',
    },
    {
      name: '23505 level GD ID',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "levels_gd_level_id_key"',
        'Key (gd_level_id)=(1000001) already exists.',
      ),
      kind: 'conflict',
      message: 'A level with that GD ID already exists.',
      constraint: 'levels_gd_level_id_key',
    },
    {
      name: '23505 player name (case-insensitive index, expression key)',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "players_name_lower_key"',
        'Key (lower(name))=(player alpha) already exists.',
      ),
      kind: 'conflict',
      message: 'A player with that name already exists.',
    },
    {
      name: '23505 player slug',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "players_slug_key"',
        'Key (slug)=(player-alpha) already exists.',
      ),
      kind: 'conflict',
      message: 'A player with that slug already exists.',
    },
    {
      name: '23505 without details: the field comes from the constraint name',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "levels_gd_level_id_key"',
      ),
      kind: 'conflict',
      message: 'A level with that GD ID already exists.',
    },
    {
      name: '23505 player name without details',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "players_name_lower_key"',
      ),
      kind: 'conflict',
      message: 'A player with that name already exists.',
    },
    {
      name: '23505 duplicate record (same player + level)',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "records_level_player_key"',
        'Key (level_id, player_id)=(…, …) already exists.',
      ),
      kind: 'conflict',
      message: 'This player already has a record for this level.',
      constraint: 'records_level_player_key',
    },
    {
      name: '23505 position clash',
      error: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "levels_position_key"',
      ),
      kind: 'conflict',
      message: /already has that position/,
    },
    {
      name: '23505 unknown constraint',
      error: postgrestError('23505', 'duplicate key value violates unique constraint "x_key"'),
      kind: 'conflict',
      message: 'Something with that value already exists.',
    },
    // 23503 foreign_key_violation → conflict
    {
      name: '23503 missing level',
      error: postgrestError(
        '23503',
        'insert or update on table "records" violates foreign key constraint "records_level_id_fkey"',
        'Key (level_id)=(11111111-1111-4111-8111-111111111111) is not present in table "levels".',
      ),
      kind: 'conflict',
      message: /That level no longer exists/,
      constraint: 'records_level_id_fkey',
    },
    {
      name: '23503 missing player',
      error: postgrestError(
        '23503',
        'insert or update on table "records" violates foreign key constraint "records_player_id_fkey"',
        'Key (player_id)=(22222222-2222-4222-8222-222222222222) is not present in table "players".',
      ),
      kind: 'conflict',
      message: /That player no longer exists/,
    },
    {
      name: '23503 still referenced (delete)',
      error: postgrestError(
        '23503',
        'update or delete on table "levels" violates foreign key constraint "records_level_id_fkey" on table "records"',
        'Key (id)=(…) is still referenced from table "records".',
      ),
      kind: 'conflict',
      message: /still used elsewhere/,
    },
    {
      name: '23503 other',
      error: postgrestError('23503', 'violates foreign key constraint "x_fkey"'),
      kind: 'conflict',
      message: /no longer exists/,
    },
    // 23514 check_violation → validation
    {
      name: '23514 ranking no-gaps trigger',
      error: postgrestError(
        '23514',
        'level positions must be 1, 2, 3 ... with no gaps',
        null,
        'Change positions with admin_create_level / admin_move_level instead of editing position directly.',
      ),
      kind: 'validation',
      message: /no gaps/,
    },
    {
      name: '23514 enjoyment check',
      error: postgrestError(
        '23514',
        'new row for relation "records" violates check constraint "records_enjoyment_check"',
        'Failing row contains (…).',
      ),
      kind: 'validation',
      message: 'Enjoyment must be between 0 and 10.',
      constraint: 'records_enjoyment_check',
    },
    {
      name: '23514 settings check',
      error: postgrestError(
        '23514',
        'new row for relation "site_settings" violates check constraint "site_settings_points_min_check"',
      ),
      kind: 'validation',
      message: /minimum points/,
    },
    {
      name: '23514 unknown check',
      error: postgrestError('23514', 'violates check constraint "mystery_check"'),
      kind: 'validation',
      message: VALIDATION_MESSAGE,
    },
    // class 22 data exceptions + not-null → validation
    {
      name: '22P02 malformed uuid',
      error: postgrestError('22P02', 'invalid input syntax for type uuid: "nope"'),
      status: 400,
      kind: 'validation',
      message: 'Some of the values have the wrong format.',
    },
    {
      name: '22004 null not allowed (admin_move_level)',
      error: postgrestError('22004', 'level id and new position are required'),
      kind: 'validation',
      message: 'Some required values are missing.',
    },
    {
      name: '22023 invalid parameter',
      error: postgrestError('22023', 'invalid parameter value'),
      kind: 'validation',
      message: VALIDATION_MESSAGE,
    },
    {
      name: '22001 too long',
      error: postgrestError('22001', 'value too long for type character(2)'),
      kind: 'validation',
      message: 'Some of the text is too long.',
    },
    {
      name: '22999 other data exception',
      error: postgrestError('22999', 'whatever'),
      kind: 'validation',
      message: VALIDATION_MESSAGE,
    },
    {
      name: '23502 not null',
      error: postgrestError('23502', 'null value in column "name" violates not-null constraint'),
      kind: 'validation',
      message: 'A required value is missing.',
    },
    // not authorized
    {
      name: '42501 permission denied',
      error: postgrestError('42501', 'permission denied for function is_admin'),
      status: 401,
      kind: 'not_authorized',
      message: NOT_AUTHORIZED_MESSAGE,
    },
    {
      name: '42501 row level security',
      error: postgrestError(
        '42501',
        'new row violates row-level security policy for table "levels"',
      ),
      status: 403,
      kind: 'not_authorized',
      message: NOT_AUTHORIZED_MESSAGE,
    },
    {
      name: 'RLS message without a code',
      error: postgrestError('', 'new row violates row-level security policy'),
      kind: 'not_authorized',
      message: NOT_AUTHORIZED_MESSAGE,
    },
    {
      name: 'admin function "not authorized"',
      error: postgrestError('42501', 'not authorized'),
      kind: 'not_authorized',
      message: NOT_AUTHORIZED_MESSAGE,
    },
    {
      name: 'PGRST302 anonymous access disabled',
      error: postgrestError('PGRST302', 'Anonymous access is disabled'),
      kind: 'not_authorized',
      message: NOT_AUTHORIZED_MESSAGE,
    },
    // session expired
    {
      name: 'PGRST301 bad JWT (live wording)',
      error: postgrestError('PGRST301', 'JWT cryptographic operation failed'),
      status: 401,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    },
    {
      name: 'PGRST303 JWT expired',
      error: postgrestError('PGRST303', 'JWT expired'),
      status: 401,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    },
    {
      name: '"JWT expired" from the gateway, no code',
      error: { message: 'JWT expired' },
      status: 401,
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    },
    {
      name: '"JWT expired" with an empty code',
      error: postgrestError('', 'JWT expired'),
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    },
    // not found
    {
      name: 'P0002 level not found (admin_move_level)',
      error: postgrestError('P0002', 'level not found'),
      kind: 'not_found',
      message: /That level no longer exists/,
    },
    {
      name: 'P0002 other',
      error: postgrestError('P0002', 'no data found'),
      kind: 'not_found',
      message: NOT_FOUND_MESSAGE,
    },
    {
      name: 'PGRST116 single() with no row (live wording)',
      error: postgrestError(
        'PGRST116',
        'Cannot coerce the result to a single JSON object',
        'The result contains 0 rows',
      ),
      status: 406,
      kind: 'not_found',
      message: NOT_FOUND_MESSAGE,
    },
    {
      name: 'PGRST103 range not satisfiable',
      error: postgrestError(
        'PGRST103',
        'Requested range not satisfiable',
        'An offset of 100 was requested, but there are only 12 rows.',
      ),
      status: 416,
      kind: 'not_found',
      message: NOT_FOUND_MESSAGE,
    },
    // concurrency, timeouts, server trouble
    {
      name: '40P01 deadlock',
      error: postgrestError('40P01', 'deadlock detected'),
      kind: 'conflict',
      message: /same moment/,
    },
    {
      name: '40001 serialization failure',
      error: postgrestError('40001', 'could not serialize access'),
      kind: 'conflict',
      message: /same moment/,
    },
    {
      name: '57014 statement timeout',
      error: postgrestError('57014', 'canceling statement due to statement timeout'),
      kind: 'network',
      message: TIMEOUT_MESSAGE,
    },
    {
      name: 'PGRST002 schema cache / database unreachable',
      error: postgrestError('PGRST002', 'Could not query the database for the schema cache.'),
      status: 503,
      kind: 'network',
      message: SERVER_BUSY_MESSAGE,
    },
    {
      name: '502 HTML page from a proxy (no code)',
      error: { message: '<html>Bad gateway</html>' },
      status: 502,
      kind: 'network',
      message: SERVER_BUSY_MESSAGE,
    },
    {
      name: '503 with an empty code',
      error: postgrestError('', 'Service Unavailable'),
      status: 503,
      kind: 'network',
      message: SERVER_BUSY_MESSAGE,
    },
    {
      name: '429 rate limited',
      error: postgrestError('', 'Too Many Requests'),
      status: 429,
      kind: 'unknown',
      message: /Too many requests/,
    },
    {
      name: 'unknown Postgres code',
      error: postgrestError('XX000', 'internal error'),
      status: 500,
      kind: 'unknown',
      message: UNKNOWN_MESSAGE,
    },
  ]

  it.each(cases)('$name', (testCase) => check(testCase))

  it('keeps the original code and status', () => {
    const result = toApiError(postgrestError('42501', 'permission denied for table levels'), {
      status: 401,
    })
    expect(result.code).toBe('42501')
    expect(result.status).toBe(401)
  })

  it('also reads PostgrestError instances (throwOnError style)', () => {
    const error = new PostgrestError({
      message: 'duplicate key value violates unique constraint "players_slug_key"',
      details: 'Key (slug)=(player-alpha) already exists.',
      hint: '',
      code: '23505',
    })
    check({
      name: 'instance',
      error,
      kind: 'conflict',
      message: 'A player with that slug already exists.',
    })
  })
})

describe('toApiError: network failures and cancelling', () => {
  // How supabase-js reports a fetch that never reached the server (status 0).
  const fetchFailure = (message: string) => ({
    message,
    details: `${message}\n\nCaused by: …`,
    hint: '',
    code: '',
  })

  it.each([
    'TypeError: Failed to fetch',
    'TypeError: NetworkError when attempting to fetch resource.',
    'TypeError: Load failed',
    'TypeError: fetch failed',
  ])('PostgREST network failure "%s" → network', (message) => {
    const result = toApiError(fetchFailure(message), { status: 0 })
    expect(result.kind).toBe('network')
    expect(result.message).toBe(NETWORK_MESSAGE)
  })

  it('a plain fetch TypeError → network', () => {
    check({
      name: 'TypeError',
      error: new TypeError('Failed to fetch'),
      kind: 'network',
      message: NETWORK_MESSAGE,
    })
  })

  it('a TypeError that is a programming mistake is not a network error', () => {
    const result = toApiError(new TypeError("Cannot read properties of undefined (reading 'x')"))
    expect(result.kind).toBe('unknown')
  })

  it('an aborted request (as supabase-js reports it) → network / aborted', () => {
    const error = {
      message: 'AbortError: This operation was aborted',
      details: 'AbortError: This operation was aborted',
      hint: 'Request was aborted (timeout or manual cancellation)',
      code: '',
    }
    const result = toApiError(error, { status: 0 })
    expect(result).toMatchObject({ kind: 'network', code: ABORTED_CODE, message: ABORTED_MESSAGE })
    expect(isAbortError(error)).toBe(true)
  })

  it('a thrown AbortError → aborted', () => {
    const error = new DOMException('The user aborted a request.', 'AbortError')
    expect(toApiError(error)).toMatchObject({ kind: 'network', code: ABORTED_CODE })
  })

  it('any error after the request signal fired → aborted', () => {
    const controller = new AbortController()
    controller.abort()
    const result = toApiError(postgrestError('', 'whatever'), { signal: controller.signal })
    expect(result.code).toBe(ABORTED_CODE)
  })

  it('a timeout → network / timeout', () => {
    const error = new DOMException('signal timed out', 'TimeoutError')
    expect(toApiError(error)).toMatchObject({
      kind: 'network',
      code: TIMEOUT_CODE,
      message: TIMEOUT_MESSAGE,
    })
    expect(toApiError({ message: 'TimeoutError: signal timed out', code: '' }).code).toBe(
      TIMEOUT_CODE,
    )
  })
})

describe('toApiError: Supabase Auth errors', () => {
  it('wrong email or password', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
    check({
      name: 'invalid_credentials',
      error,
      kind: 'not_authorized',
      message: 'Invalid email or password.',
    })
    expect(toApiError(error).code).toBe('invalid_credentials')
  })

  it('a missing session means the session expired', () => {
    check({
      name: 'missing',
      error: new AuthSessionMissingError(),
      kind: 'not_authorized',
      message: SESSION_EXPIRED_MESSAGE,
      sessionExpired: true,
    })
  })

  it.each(['session_expired', 'refresh_token_not_found', 'session_not_found', 'bad_jwt'])(
    'auth code %s means the session expired',
    (code) => {
      const result = toApiError(new AuthApiError('nope', 401, code))
      expect(result).toMatchObject({ kind: 'not_authorized', sessionExpired: true })
    },
  )

  it('a network failure during login → network', () => {
    check({
      name: 'retryable',
      error: new AuthRetryableFetchError('Failed to fetch', 0),
      kind: 'network',
      message: NETWORK_MESSAGE,
    })
  })

  it('a weak password → validation', () => {
    const error = new AuthWeakPasswordError('Password is too weak', 422, ['length'])
    expect(toApiError(error)).toMatchObject({ kind: 'validation', code: 'weak_password' })
  })

  it('rate limits → unknown with a "wait" message', () => {
    const result = toApiError(new AuthApiError('Too many', 429, 'over_request_rate_limit'))
    expect(result.kind).toBe('unknown')
    expect(result.message).toMatch(/Wait a few minutes/)
  })

  it('anything else from Auth → unknown', () => {
    expect(toApiError(new AuthApiError('Database error', 500, 'unexpected_failure')).kind).toBe(
      'unknown',
    )
  })
})

describe('toApiError: Supabase Storage errors', () => {
  it.each<[string, StorageApiError, ApiErrorKind, RegExp | string]>([
    [
      'RLS refusal',
      new StorageApiError('new row violates row-level security policy', 400, '403'),
      'not_authorized',
      NOT_AUTHORIZED_MESSAGE,
    ],
    [
      'duplicate file',
      new StorageApiError('The resource already exists', 409, '409'),
      'conflict',
      /already exists/,
    ],
    [
      'file too big',
      new StorageApiError('The object exceeded the maximum allowed size', 413, '413'),
      'validation',
      /2 MB/,
    ],
    [
      'wrong type',
      new StorageApiError('mime type image/gif is not supported', 415, '415'),
      'validation',
      /PNG, JPEG or WebP/,
    ],
    ['missing file', new StorageApiError('Object not found', 404, '404'), 'not_found', /no longer/],
    ['other', new StorageApiError('Internal error', 500, '500'), 'unknown', UNKNOWN_MESSAGE],
  ])('%s', (_name, error, kind, message) => {
    const result = toApiError(error)
    expect(result.kind).toBe(kind)
    if (typeof message === 'string') expect(result.message).toBe(message)
    else expect(result.message).toMatch(message)
    expect(result.cause).toBe(error)
  })

  it('an expired token → session expired', () => {
    const error = new StorageApiError('"exp" claim timestamp check failed', 400, '403')
    expect(toApiError(error)).toMatchObject({ kind: 'not_authorized', sessionExpired: true })
    expect(isSessionExpiredError(new StorageApiError('jwt expired', 400, '400'))).toBe(true)
  })

  it('a network failure (StorageUnknownError wrapping the fetch TypeError) → network', () => {
    const error = Object.assign(new Error('Failed to fetch'), {
      __isStorageError: true,
      originalError: new TypeError('Failed to fetch'),
    })
    expect(toApiError(error)).toMatchObject({ kind: 'network', message: NETWORK_MESSAGE })
  })
})

describe('toApiError: everything else', () => {
  it('returns an ApiError unchanged', () => {
    const error = new ApiError({ kind: 'validation', message: 'x' })
    expect(toApiError(error)).toBe(error)
  })

  it.each([new Error('boom'), 'boom', 42, null, undefined, { foo: 'bar' }])(
    'turns %s into an unknown error that keeps the cause',
    (value) => {
      const result = toApiError(value)
      expect(result.kind).toBe('unknown')
      expect(result.message).toBe(UNKNOWN_MESSAGE)
      expect(result.cause).toBe(value)
    },
  )

  it('never throws itself, even for values that throw when read', () => {
    // src/api's run() relies on this: otherwise a non-ApiError would escape to the pages.
    const throwingGetter = Object.defineProperty({}, 'message', {
      get() {
        throw new Error('boom')
      },
    })
    const revoked = Proxy.revocable({}, {})
    revoked.revoke()
    for (const value of [throwingGetter, revoked.proxy]) {
      let result: unknown
      expect(() => {
        result = toApiError(value)
      }).not.toThrow()
      expect(result).toBeInstanceOf(ApiError)
      expect(result).toMatchObject({ kind: 'unknown', message: UNKNOWN_MESSAGE })
      expect((result as ApiError).cause).toBe(value)
    }
  })

  it('looks at a wrapped cause when the error itself is not recognised', () => {
    const offline = new Error('Loading failed', { cause: new TypeError('Failed to fetch') })
    expect(toApiError(offline)).toMatchObject({ kind: 'network', message: NETWORK_MESSAGE })
    expect(toApiError(offline).cause).toBe(offline)

    const cancelled = new Error('wrapper', {
      cause: new DOMException('The operation was aborted.', 'AbortError'),
    })
    expect(toApiError(cancelled)).toMatchObject({ kind: 'network', code: ABORTED_CODE })

    const duplicate = new Error('Saving failed', {
      cause: postgrestError(
        '23505',
        'duplicate key value violates unique constraint "levels_slug_key"',
        'Key (slug)=(sample-level-1) already exists.',
      ),
    })
    expect(toApiError(duplicate)).toMatchObject({
      kind: 'conflict',
      code: '23505',
      constraint: 'levels_slug_key',
      message: 'A level with that slug already exists.',
    })

    // Two levels deep is still found.
    const deep = new Error('outer', { cause: new Error('middle', { cause: offline }) })
    expect(toApiError(deep).kind).toBe('network')
  })

  it('stops on cause loops and very long cause chains', () => {
    const loop: { message: string; cause?: unknown } = { message: 'loop' }
    loop.cause = loop
    expect(toApiError(loop)).toMatchObject({ kind: 'unknown', message: UNKNOWN_MESSAGE })

    let chain: unknown = new TypeError('Failed to fetch')
    for (let i = 0; i < 50; i++) chain = new Error(`level ${i}`, { cause: chain })
    expect(toApiError(chain).kind).toBe('unknown')
  })
})

describe('isSessionExpiredError', () => {
  it('is true only for expired / invalid logins', () => {
    expect(
      isSessionExpiredError(postgrestError('PGRST301', 'JWT cryptographic operation failed')),
    ).toBe(true)
    expect(isSessionExpiredError(postgrestError('PGRST303', 'JWT expired'))).toBe(true)
    expect(isSessionExpiredError(new AuthSessionMissingError())).toBe(true)
    expect(
      isSessionExpiredError(
        new ApiError({ kind: 'not_authorized', message: 'x', sessionExpired: true }),
      ),
    ).toBe(true)

    expect(isSessionExpiredError(postgrestError('42501', 'permission denied'))).toBe(false)
    expect(isSessionExpiredError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isSessionExpiredError(new AuthApiError('Invalid', 400, 'invalid_credentials'))).toBe(
      false,
    )
    expect(isSessionExpiredError(new Error('boom'))).toBe(false)
  })
})
