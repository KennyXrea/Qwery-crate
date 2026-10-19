import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/*
 * Runs before every test file.
 *
 * 1. NO NETWORK, EVER. src/lib/supabase is replaced by an offline client (offline-supabase.ts):
 *    every query fails with a clear message instead of reaching the real database. A test file
 *    can still swap in its own fake with `vi.mock('../lib/supabase', …)` (the src/api tests use
 *    fake-supabase.ts), and the one test of the real client uses `vi.unmock`.
 *
 * 2. Every data module in src/api is wrapped in spies that still run the real code. That lets
 *    any test — e.g. a page test — replace an API function with fixture data without its own
 *    vi.mock lines:  `mockApiDefaults()` (api-mocks.ts) for a whole fake dataset, or
 *    `vi.mocked(getLevels).mockResolvedValue(…)` for one function. Until a test does that, the
 *    real function runs against the offline client and fails (the page shows its error state).
 */
vi.mock('../lib/supabase', async () => {
  const { offlineSupabase } = await import('./offline-supabase')
  return { supabase: offlineSupabase }
})
vi.mock('../api/levels', { spy: true })
vi.mock('../api/players', { spy: true })
vi.mock('../api/records', { spy: true })
vi.mock('../api/recent', { spy: true })
vi.mock('../api/search', { spy: true })
vi.mock('../api/settings', { spy: true })
vi.mock('../api/stats', { spy: true })

// 3. jsdom gaps the app runs into: ScrollRestoration scrolls the window on navigation, and
//    some components ask matchMedia about the screen.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true, configurable: true })
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
}

// Vitest globals are off, so Testing Library can't register its automatic cleanup.
// Unmount whatever a test rendered so the next test starts with an empty page.
afterEach(() => {
  cleanup()
})
