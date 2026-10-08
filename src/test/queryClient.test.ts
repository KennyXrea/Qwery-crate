import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient, queryClient } from '../lib/queryClient'

const DEFAULTS = { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false }

describe('createQueryClient', () => {
  it('sets the app-wide query defaults', () => {
    const client = createQueryClient()
    expect(client).toBeInstanceOf(QueryClient)
    expect(client.getDefaultOptions().queries).toMatchObject(DEFAULTS)
    // Every query picks them up unless it overrides them.
    expect(client.defaultQueryOptions({ queryKey: ['anything'] })).toMatchObject(DEFAULTS)
  })

  it('makes a new, empty client each time', () => {
    const first = createQueryClient()
    first.setQueryData(['key'], 'cached')
    const second = createQueryClient()
    expect(second).not.toBe(first)
    expect(second.getQueryData(['key'])).toBeUndefined()
  })

  it('exports one shared client with the same defaults', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
    expect(queryClient.getDefaultOptions().queries).toMatchObject(DEFAULTS)
  })
})

describe('query behaviour with the defaults', () => {
  let client: QueryClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = createQueryClient()
  })

  afterEach(() => {
    client.clear()
    vi.useRealTimers()
  })

  it('retries a failed request once, then reports the error', async () => {
    const queryFn = vi.fn(() => Promise.reject(new Error('offline')))
    const result = client.fetchQuery({ queryKey: ['fails'], queryFn })
    const settled = expect(result).rejects.toThrow('offline')

    await vi.advanceTimersByTimeAsync(10_000)
    await settled
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('succeeds when the retry works', async () => {
    const queryFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValueOnce('data')
    const result = client.fetchQuery({ queryKey: ['flaky'], queryFn })

    await vi.advanceTimersByTimeAsync(10_000)
    await expect(result).resolves.toBe('data')
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('reuses data for a minute, then fetches again', async () => {
    const queryFn = vi.fn(() => Promise.resolve('levels'))
    const options = { queryKey: ['levels'], queryFn }

    await client.fetchQuery(options)
    await vi.advanceTimersByTimeAsync(59_000)
    await client.fetchQuery(options)
    expect(queryFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2_000)
    await client.fetchQuery(options)
    expect(queryFn).toHaveBeenCalledTimes(2)
  })
})
