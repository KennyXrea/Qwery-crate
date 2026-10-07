/**
 * Pure helpers that recognise Supabase API keys. This file must never touch
 * `import.meta.env`: it is shared by the browser code (src/lib/env.ts) and by the build
 * config (vite.config.ts), which uses it to stop a build that would publish a secret key.
 */

/** Decodes the payload of a JWT-shaped string, or returns null if it isn't one. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    return typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** True for keys that must never reach the browser (new-style secret keys or legacy service_role JWTs). */
export function isSecretKey(key: string): boolean {
  const value = key.trim()
  if (value.startsWith('sb_secret_')) return true
  return decodeJwtPayload(value)?.role === 'service_role'
}

/** True for a new-style publishable key or a legacy "anon" JWT. */
export function isPublishableKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key)) return true
  return decodeJwtPayload(key)?.role === 'anon'
}

/** Variable names that suggest a server-only secret, e.g. VITE_SUPABASE_SECRET_KEY. */
const SECRET_LOOKING_NAME = /SECRET|SERVICE_ROLE/i

/**
 * Checks the VITE_ variables a build is about to publish (Vite copies them into the public
 * JavaScript). Returns one message per variable that holds a secret / service_role key, or is
 * named like one; an empty list means nothing secret would be published.
 */
export function findPublishedSecrets(env: Record<string, string | undefined>): string[] {
  const problems: string[] = []
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value?.trim()) continue
    if (isSecretKey(value)) {
      problems.push(`${name} contains a Supabase SECRET (service_role) key.`)
    } else if (SECRET_LOOKING_NAME.test(name)) {
      problems.push(`${name} is named like a secret, and every VITE_ variable is public.`)
    }
  }
  return problems
}
