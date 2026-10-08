/**
 * Helpers for links people typed in (channel links, video links). The database already only
 * accepts http(s) links; this is a second check right before a link is put in an <a href>,
 * so a "javascript:" or "data:" link can never become clickable.
 */

/**
 * Parses a full http:// or https:// link that has a host and no user name or password;
 * anything else gives null. The shared first check for every link people typed in.
 */
export function parseExternalUrl(url: string | null | undefined): URL | null {
  if (typeof url !== 'string' || url.trim() === '') return null
  let parsed: URL
  try {
    // No base URL, so relative links ("/admin", "example.com") are rejected.
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (!parsed.hostname) return null
  // "https://youtube.com@evil.example" really goes to evil.example: refuse links with a
  // user name or password, which are almost only used to disguise where a link goes.
  if (parsed.username || parsed.password) return null
  return parsed
}

/**
 * Returns the link, tidied up by the browser's URL parser, if it is a full http:// or
 * https:// address; otherwise null. Use it for every user-entered link shown as <a href>.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  return parseExternalUrl(url)?.href ?? null
}

/**
 * A short label for a link, such as "example.com" for "https://www.example.com/page",
 * or null if the link isn't a safe external link. International domain names are shown in
 * their ASCII (xn--…) form, so look-alike letters can't disguise the real site.
 */
export function hostLabel(url: string | null | undefined): string | null {
  const parsed = parseExternalUrl(url)
  if (!parsed) return null
  // Only when a real name follows, so "https://www./" isn't shown as an empty label.
  const host = parsed.hostname.replace(/^www\.(?=[^.])/, '')
  return parsed.port ? `${host}:${parsed.port}` : host
}
