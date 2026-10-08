import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import {
  CHUNK_SIZE,
  clampInt,
  ensureOk,
  isUuid,
  pageWindow,
  readAllRows,
  readPage,
  run,
  withSignal,
} from '../api/request'
import { postgrestError } from './api-fixtures'

describe('pageWindow / clampInt', () => {
  it('turns 1-based pages into inclusive row ranges', () => {
    expect(pageWindow(1, 25)).toEqual({ page: 1, pageSize: 25, from: 0, to: 24 })
    expect(pageWindow(4, 30)).toEqual({ page: 4, pageSize: 30, from: 90, to: 119 })
    expect(pageWindow(undefined, undefined)).toEqual({ page: 1, pageSize: 25, from: 0, to: 24 })
    expect(pageWindow(undefined, undefined, 30).pageSize).toBe(30)
  })

  it('clamps and truncates', () => {
    expect(clampInt(undefined, 1, 10, 5)).toBe(5)
    expect(clampInt(Number.POSITIVE_INFINITY, 1, 10, 5)).toBe(5)
    expect(clampInt(-3, 1, 10, 5)).toBe(1)
    expect(clampInt(99, 1, 10, 5)).toBe(10)
    expect(clampInt(3.9, 1, 10, 5)).toBe(3)
  })
})

describe('ensureOk / run', () => {
  it('returns successful responses and throws ApiErrors for failed ones', () => {
    const ok = { data: [1], error: null, status: 200 }
    expect(ensureOk(ok)).toBe(ok)
    expect(() =>
      ensureOk({ data: null, error: postgrestError('42501', 'permission denied'), status: 401 }),
    ).toThrow(ApiError)
  })

  it('run() turns anything thrown into an ApiError', async () => {
    await expect(run(() => Promise.reject(new Error('boom')))).rejects.toBeInstanceOf(ApiError)
    await expect(run(() => Promise.resolve(3))).resolves.toBe(3)
  })

  it('run() reports errors after the signal fired as cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      run(() => Promise.reject(new Error('anything')), controller.signal),
    ).rejects.toMatchObject({ code: 'aborted' })
  })
})

describe('withSignal', () => {
  it('calls abortSignal() only when there is a signal', () => {
    const builder = { abortSignal: vi.fn() }
    expect(withSignal(builder, undefined)).toBe(builder)
    expect(builder.abortSignal).not.toHaveBeenCalled()
    const { signal } = new AbortController()
    withSignal(builder, signal)
    expect(builder.abortSignal).toHaveBeenCalledWith(signal)
  })
})

describe('readPage', () => {
  const window = pageWindow(2, 10)

  it('returns rows and the exact count', () => {
    expect(readPage({ data: ['a'], error: null, count: 11, status: 206 }, window)).toEqual({
      rows: ['a'],
      total: 11,
    })
  })

  it('PGRST103 → empty page with the total from the message', () => {
    const error = postgrestError(
      'PGRST103',
      'Requested range not satisfiable',
      'An offset of 10 was requested, but there are only 1 rows.',
    )
    expect(readPage({ data: null, error, count: null, status: 416 }, window)).toEqual({
      rows: [],
      total: 1,
    })
  })

  it('PGRST103 without a readable total → not_found ApiError', () => {
    const error = postgrestError('PGRST103', 'Requested range not satisfiable', 'odd')
    expect(() => readPage({ data: null, error, count: null, status: 416 }, window)).toThrow(
      expect.objectContaining({ kind: 'not_found' }),
    )
  })

  it('other errors → ApiError', () => {
    const error = postgrestError('22P02', 'invalid input syntax for type uuid')
    expect(() => readPage({ data: null, error, count: null, status: 400 }, window)).toThrow(
      expect.objectContaining({ kind: 'validation' }),
    )
  })
})

describe('readAllRows', () => {
  it('stops after one chunk when everything fit', async () => {
    const makeQuery = vi.fn(() =>
      Promise.resolve({ data: [1, 2], error: null, count: 2, status: 200 }),
    )
    await expect(readAllRows(makeQuery)).resolves.toEqual([1, 2])
    expect(makeQuery).toHaveBeenCalledWith(0, CHUNK_SIZE - 1)
    expect(makeQuery).toHaveBeenCalledTimes(1)
  })

  it('keeps asking until it has `count` rows, even if the server sends smaller chunks', async () => {
    // A project whose "max rows" is 2: every response is cut to 2 rows.
    const all = [1, 2, 3, 4, 5]
    const makeQuery = vi.fn((from: number) =>
      Promise.resolve({ data: all.slice(from, from + 2), error: null, count: 5, status: 200 }),
    )
    await expect(readAllRows(makeQuery)).resolves.toEqual(all)
    expect(makeQuery.mock.calls.map(([from]) => from)).toEqual([0, 2, 4])
  })

  it('stops on an empty chunk and throws ApiErrors', async () => {
    const empty = vi.fn(() => Promise.resolve({ data: [], error: null, count: 9, status: 200 }))
    await expect(readAllRows(empty)).resolves.toEqual([])
    expect(empty).toHaveBeenCalledTimes(1)

    const failing = () =>
      Promise.resolve({
        data: null,
        error: postgrestError('42501', 'denied'),
        count: null,
        status: 401,
      })
    await expect(readAllRows(failing)).rejects.toMatchObject({ kind: 'not_authorized' })
  })
})

describe('isUuid', () => {
  it('accepts database ids only', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isUuid('11111111-1111-4111-8111-11111111111G')).toBe(false)
    expect(isUuid('player-alpha')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})
