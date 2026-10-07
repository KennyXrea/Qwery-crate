import { isPublishableKey, isSecretKey } from './env-keys'
import { z } from './zod'

/**
 * Frontend environment variables, validated once at startup.
 * Anything prefixed VITE_ is bundled into public JavaScript, so only the
 * PUBLISHABLE key may ever appear here — never the secret / service_role key.
 * (A build that would publish a secret key is stopped in vite.config.ts.)
 */
export type Env = {
  supabaseUrl: string
  supabasePublishableKey: string
}

export type EnvResult = { ok: true; env: Env } | { ok: false; problems: string[] }

const PLACEHOLDER =
  'still has the example value from .env.example — replace it with your real value'

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isAllowedUrl(value: string): boolean {
  const url = parseUrl(value)
  if (!url) return false
  if (url.protocol === 'https:') return true
  // Plain http is only acceptable for a Supabase instance running on this computer.
  return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
}

/**
 * True when the URL is only an address (scheme, host and optional port). A path such as
 * /rest/v1 or /dashboard/project/…, a ?query, a #hash or user:password@ would make every
 * Supabase request go to the wrong place.
 */
function isOriginOnly(value: string): boolean {
  const url = parseUrl(value)
  if (!url) return true // not a URL at all: isAllowedUrl reports that
  return (
    url.pathname.replace(/\/+$/, '') === '' &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password
  )
}

const requiredText = (name: string) =>
  z
    .string({ error: `${name} is missing` })
    .trim()
    .min(1, `${name} is missing (it's empty)`)

const envSchema = z.object({
  VITE_SUPABASE_URL: requiredText('VITE_SUPABASE_URL')
    .refine((v) => !/your-project-ref/i.test(v), `VITE_SUPABASE_URL ${PLACEHOLDER}`)
    .refine(
      isAllowedUrl,
      'VITE_SUPABASE_URL must be a full https:// address, like https://abcdefghijklmnopqrst.supabase.co',
    )
    .refine(
      isOriginOnly,
      'VITE_SUPABASE_URL should be just the Project URL, like https://abcdefghijklmnopqrst.supabase.co — not the dashboard address or a link ending in /rest/v1',
    ),
  VITE_SUPABASE_PUBLISHABLE_KEY: requiredText('VITE_SUPABASE_PUBLISHABLE_KEY')
    .refine(
      (v) => v.toLowerCase() !== 'sb_publishable_xxx',
      `VITE_SUPABASE_PUBLISHABLE_KEY ${PLACEHOLDER}`,
    )
    .refine(
      (v) => !isSecretKey(v),
      'VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. Remove it right away — only the publishable (or "anon public") key belongs in the website.',
    )
    .refine(
      (v) => isSecretKey(v) || isPublishableKey(v),
      'VITE_SUPABASE_PUBLISHABLE_KEY does not look like a Supabase publishable key (it should start with sb_publishable_, or be the legacy "anon public" key)',
    ),
})

export function parseEnv(raw: Record<string, unknown>): EnvResult {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    // One clear message per variable is enough for a person to act on.
    const seen = new Set<PropertyKey>()
    const problems: string[] = []
    for (const issue of result.error.issues) {
      const key = issue.path[0] ?? ''
      if (seen.has(key)) continue
      seen.add(key)
      problems.push(issue.message)
    }
    return { ok: false, problems }
  }
  return {
    ok: true,
    env: {
      // Validated above, so this parses; `origin` drops any trailing slash.
      supabaseUrl: new URL(result.data.VITE_SUPABASE_URL).origin,
      supabasePublishableKey: result.data.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  }
}

// Read the two variables one by one. Passing the whole `import.meta.env` object would make
// Vite copy EVERY VITE_ variable into the public JavaScript, even ones no code uses.
export const envResult: EnvResult = parseEnv({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})

/**
 * The validated env. main.tsx only mounts the app after validation passed,
 * so code inside the app can call this safely.
 */
export function getEnv(): Env {
  if (!envResult.ok) {
    throw new Error(`Configuration error: ${envResult.problems.join('; ')}`)
  }
  return envResult.env
}
