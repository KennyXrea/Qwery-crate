import { describe, expect, it } from 'vitest'
import { parseEnv } from '../lib/env'
import { findPublishedSecrets, isPublishableKey, isSecretKey } from '../lib/env-keys'
import { z } from '../lib/zod'

/** Builds an unsigned JWT-shaped string with the given payload (signature is irrelevant here). */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`
}

const URL_OK = 'https://abcdefghijklmnopqrst.supabase.co'
const KEY_OK = 'sb_publishable_AbCdEf123456_xyz'

describe('parseEnv', () => {
  it('accepts a valid URL and publishable key', () => {
    const r = parseEnv({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK })
    expect(r).toEqual({ ok: true, env: { supabaseUrl: URL_OK, supabasePublishableKey: KEY_OK } })
  })

  it('accepts a legacy anon JWT key and trims whitespace / trailing slashes', () => {
    const anon = fakeJwt({ role: 'anon', iss: 'supabase' })
    const r = parseEnv({ VITE_SUPABASE_URL: ` ${URL_OK}/ `, VITE_SUPABASE_PUBLISHABLE_KEY: anon })
    expect(r).toEqual({ ok: true, env: { supabaseUrl: URL_OK, supabasePublishableKey: anon } })
  })

  it('reports both variables when they are missing', () => {
    const r = parseEnv({})
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.problems).toHaveLength(2)
      expect(r.problems[0]).toMatch(/VITE_SUPABASE_URL is missing/)
      expect(r.problems[1]).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY is missing/)
    }
  })

  it('treats empty strings as missing', () => {
    const r = parseEnv({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_PUBLISHABLE_KEY: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.every((p) => /missing/.test(p))).toBe(true)
  })

  it('rejects the placeholder values copied from .env.example', () => {
    const r = parseEnv({
      VITE_SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxx',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.problems).toHaveLength(2)
      expect(r.problems.every((p) => /example value/.test(p))).toBe(true)
    }
  })

  it('rejects non-https URLs except for localhost', () => {
    const bad = parseEnv({
      VITE_SUPABASE_URL: 'http://example.com',
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
    })
    expect(bad.ok).toBe(false)
    const notUrl = parseEnv({
      VITE_SUPABASE_URL: 'supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
    })
    expect(notUrl.ok).toBe(false)
    const local = parseEnv({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
    })
    expect(local.ok).toBe(true)
  })

  it('rejects the placeholder URL in any letter case', () => {
    const r = parseEnv({
      VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems).toEqual([expect.stringMatching(/example value/)])
  })

  it.each([
    ['a /rest/v1 address', `${URL_OK}/rest/v1/`],
    ['the dashboard address', 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst'],
    ['a query string', `${URL_OK}/?x=1`],
    ['a #hash', `${URL_OK}/#h`],
    ['a user name and password', 'https://user:pw@abcdefghijklmnopqrst.supabase.co'],
  ])('rejects a URL with %s and asks for just the Project URL', (_label, url) => {
    const r = parseEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems).toEqual([expect.stringMatching(/just the Project URL/)])
  })

  it('returns the bare origin of a valid URL', () => {
    const r = parseEnv({
      VITE_SUPABASE_URL: 'https://ABCDEFGHIJKLMNOPQRST.supabase.co:443//',
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
    })
    expect(r).toEqual({ ok: true, env: { supabaseUrl: URL_OK, supabasePublishableKey: KEY_OK } })
  })

  it('refuses a new-style secret key with a loud warning', () => {
    const r = parseEnv({
      VITE_SUPABASE_URL: URL_OK,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123456789',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems).toEqual([expect.stringMatching(/SECRET key/)])
  })

  it('refuses a legacy service_role JWT', () => {
    const r = parseEnv({
      VITE_SUPABASE_URL: URL_OK,
      VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt({ role: 'service_role' }),
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems[0]).toMatch(/SECRET key/)
  })

  it('rejects random text that is not a Supabase key', () => {
    const r = parseEnv({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: 'hello' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems[0]).toMatch(/does not look like/)
  })
})

describe('key helpers', () => {
  it('classifies keys', () => {
    expect(isSecretKey('sb_secret_123')).toBe(true)
    expect(isSecretKey(KEY_OK)).toBe(false)
    expect(isPublishableKey(KEY_OK)).toBe(true)
    expect(isPublishableKey(fakeJwt({ role: 'anon' }))).toBe(true)
    expect(isPublishableKey(fakeJwt({ role: 'authenticated' }))).toBe(false)
    expect(isPublishableKey('not.a.jwt')).toBe(false)
    expect(isSecretKey(fakeJwt({ role: 'service_role' }))).toBe(true)
    expect(isSecretKey(' sb_secret_123 ')).toBe(true)
  })
})

describe('findPublishedSecrets (build-time guard in vite.config.ts)', () => {
  it('passes a normal set of VITE_ variables', () => {
    expect(
      findPublishedSecrets({
        VITE_SUPABASE_URL: URL_OK,
        VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK,
        VITE_SOMETHING_EMPTY_SECRET: '',
      }),
    ).toEqual([])
  })

  it('names every VITE_ variable that holds a secret key or is named like one', () => {
    const problems = findPublishedSecrets({
      VITE_SUPABASE_URL: URL_OK,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123456789',
      VITE_LEGACY_KEY: fakeJwt({ role: 'service_role' }),
      VITE_SUPABASE_SERVICE_ROLE: 'anything',
      // Not a VITE_ variable, so Vite never publishes it.
      SUPABASE_SECRET_KEY: 'sb_secret_abc123456789',
    })
    expect(problems).toHaveLength(3)
    expect(problems[0]).toMatch(/^VITE_SUPABASE_PUBLISHABLE_KEY contains a Supabase SECRET/)
    expect(problems[1]).toMatch(/^VITE_LEGACY_KEY contains a Supabase SECRET/)
    expect(problems[2]).toMatch(/^VITE_SUPABASE_SERVICE_ROLE is named like a secret/)
  })
})

describe('zod setup', () => {
  it('runs zod without its eval() probe, so the strict CSP never reports it', () => {
    expect(z.config().jitless).toBe(true)
  })
})
