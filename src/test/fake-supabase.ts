/**
 * A tiny stand-in for the Supabase client, for testing src/api without any network.
 *
 * Use it in a test file like this (vi.mock is hoisted, so the factory imports the fake itself):
 *
 *   vi.mock('../lib/supabase', async () => {
 *     const { fakeSupabase } = await import('./fake-supabase')
 *     return { supabase: fakeSupabase.client }
 *   })
 *
 * Every `supabase.from(…)` / `supabase.rpc(…)` chain is recorded (each method name and its
 * arguments, in order), and awaiting it resolves to a supabase-js style response
 * ({ data, error, count, status }) chosen by the test with `respond()` or `queue()`.
 */

export type RecordedCall = { method: string; args: unknown[] }

export type RecordedQuery = {
  kind: 'from' | 'rpc'
  /** Table / view name, or function name for rpc. */
  target: string
  /** For rpc: the arguments object. */
  rpcArgs?: unknown
  calls: RecordedCall[]
}

export type FakeResponse = {
  data?: unknown
  error?: unknown
  count?: number | null
  status?: number
}

export type Responder = (query: RecordedQuery) => FakeResponse

class FakeSupabase {
  readonly queries: RecordedQuery[] = []
  private readonly queued: FakeResponse[] = []
  private responder: Responder = () => ({ data: [], count: 0 })

  /** The object the mocked module exports as `supabase`. */
  readonly client = {
    from: (table: string) => this.builder({ kind: 'from', target: table, calls: [] }),
    rpc: (fn: string, args?: unknown) =>
      this.builder({ kind: 'rpc', target: fn, rpcArgs: args, calls: [] }),
  }

  /** Answers every query with what `responder` returns (unless a queued answer is waiting). */
  respond(responder: Responder): void {
    this.responder = responder
  }

  /** Answers the next queries, in the order they are awaited, with these responses. */
  queue(...responses: FakeResponse[]): void {
    this.queued.push(...responses)
  }

  reset(): void {
    this.queries.length = 0
    this.queued.length = 0
    this.responder = () => ({ data: [], count: 0 })
  }

  /** The only query that ran (fails the test if there were more or none). */
  onlyQuery(): RecordedQuery {
    if (this.queries.length !== 1) {
      throw new Error(`expected exactly 1 query, got ${this.queries.length}`)
    }
    return this.queries[0] as RecordedQuery
  }

  private resolve(query: RecordedQuery) {
    const response = this.queued.shift() ?? this.responder(query)
    const error = response.error ?? null
    return {
      data: response.data === undefined ? null : response.data,
      error,
      count: response.count ?? null,
      status: response.status ?? (error ? 400 : 200),
      statusText: '',
    }
  }

  private builder(query: RecordedQuery): unknown {
    this.queries.push(query)
    const proxy: unknown = new Proxy(
      {},
      {
        get: (_target, property) => {
          if (property === 'then') {
            return (
              onFulfilled?: (value: unknown) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) =>
              Promise.resolve()
                .then(() => this.resolve(query))
                .then(onFulfilled, onRejected)
          }
          if (typeof property === 'symbol') return undefined
          return (...args: unknown[]) => {
            query.calls.push({ method: property, args })
            return proxy
          }
        },
      },
    )
    return proxy
  }
}

export const fakeSupabase = new FakeSupabase()

/** The arguments of every call to `method` in the query, in order. */
export function callsOf(query: RecordedQuery, method: string): unknown[][] {
  return query.calls.filter((call) => call.method === method).map((call) => call.args)
}

/** Just the method names, in order (handy to check that nothing unexpected was added). */
export function methodsOf(query: RecordedQuery): string[] {
  return query.calls.map((call) => call.method)
}
