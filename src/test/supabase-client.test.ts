import { describe, expect, it, vi } from 'vitest'

// No real client and no network: createClient is replaced, and the env is a fixed fake.
const createClient = vi.hoisted(() =>
  vi.fn<(url: string, key: string, options?: unknown) => { fake: string }>(() => ({
    fake: 'client',
  })),
)

// src/test/setup.ts swaps src/lib/supabase for an offline stand-in in every test; this test is
// about the real module, so it asks for it back.
vi.unmock('../lib/supabase')
vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('../lib/env', () => ({
  getEnv: () => ({
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  }),
}))

describe('src/lib/supabase', () => {
  it('creates one client from the validated env, with the default auth options', async () => {
    const { supabase } = await import('../lib/supabase')
    const again = await import('../lib/supabase')

    expect(createClient).toHaveBeenCalledTimes(1)
    // Exactly (url, key): no options object, so the login session persists and auto-refreshes.
    expect(createClient).toHaveBeenCalledWith(
      'https://abcdefghijklmnopqrst.supabase.co',
      'sb_publishable_test',
    )
    expect(createClient.mock.calls[0]).toHaveLength(2)
    expect(supabase).toEqual({ fake: 'client' })
    expect(again.supabase).toBe(supabase)
  })
})
