/**
 * The Supabase client EVERY test gets unless it says otherwise: src/test/setup.ts replaces
 * src/lib/supabase with this, so no test can ever reach the real database (and the real
 * project URL / key from .env.local are never even read).
 *
 * - Every query (`supabase.from(…)…`, `supabase.rpc(…)`) fails with OFFLINE_ERROR, which
 *   src/api turns into an ApiError — a page under test then shows its error state.
 *   A warning names the table, so a forgotten mock is easy to spot.
 * - `auth` answers "nobody is logged in" (so an auth provider can start), and refuses logins.
 *
 * Tests that need data mock the src/api functions instead (see src/test/api-mocks.ts), and
 * src/api's own tests swap this for src/test/fake-supabase.ts with their own vi.mock.
 */

export const OFFLINE_MESSAGE =
  'Tests never use the network. Mock the src/api function instead (see src/test/api-mocks.ts).'

export const OFFLINE_ERROR = Object.freeze({
  code: 'TEST_OFFLINE',
  message: OFFLINE_MESSAGE,
  details: null,
  hint: null,
})

const warned = new Set<string>()

function warnOnce(target: string): void {
  if (warned.has(target)) return
  warned.add(target)
  console.warn(`[offline-supabase] A test queried "${target}". ${OFFLINE_MESSAGE}`)
}

/** A query builder: every method returns the builder again; awaiting it gives the failure. */
function offlineQuery(target: string): unknown {
  const builder: unknown = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') {
          return (
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => {
            warnOnce(target)
            return Promise.resolve({
              data: null,
              error: OFFLINE_ERROR,
              count: null,
              status: 503,
              statusText: 'Offline (test)',
            }).then(onFulfilled, onRejected)
          }
        }
        if (typeof property === 'symbol') return undefined
        return () => builder
      },
    },
  )
  return builder
}

const noSession = () => Promise.resolve({ data: { session: null }, error: null })
const noUser = () => Promise.resolve({ data: { user: null }, error: null })
const refused = () =>
  Promise.resolve({ data: { user: null, session: null }, error: { ...OFFLINE_ERROR, status: 503 } })

export const offlineSupabase = {
  from: (table: string) => offlineQuery(table),
  rpc: (fn: string) => offlineQuery(`rpc ${fn}`),
  storage: {
    from: (bucket: string) => offlineQuery(`storage ${bucket}`),
  },
  auth: {
    getSession: noSession,
    getUser: noUser,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: refused,
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: refused,
    updateUser: refused,
  },
}
