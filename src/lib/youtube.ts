import { parseExternalUrl } from './url'

/**
 * YouTube helpers. Only a parsed, validated video ID is ever put into an embed or image URL,
 * never the link a person typed, so a bad link can't smuggle anything into an <iframe>.
 */

/** Every YouTube video ID is exactly 11 characters from this set. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

// Exact host names only: a check like endsWith('youtube.com') would also let
// evilyoutube.com or youtube.com.evil.example through.
const MAIN_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])
const NOCOOKIE_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])
const SHORT_HOST = 'youtu.be'

/** youtube.com/<prefix>/<id> */
const ID_PATH_PREFIXES = new Set(['shorts', 'embed', 'live', 'v'])

/** True when `value` looks like a YouTube video ID (11 letters, digits, - or _). */
export function isYouTubeId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID.test(value)
}

function idOrNull(value: string | null | undefined): string | null {
  return isYouTubeId(value) ? value : null
}

/**
 * Pulls the video ID out of a YouTube link, or returns null when the link isn't a YouTube
 * video. Handles watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/, the mobile, music and
 * no-cookie hosts, and ignores extra parameters such as &t=42s, ?si=… or &list=….
 */
export function getYouTubeId(url: string | null | undefined): string | null {
  // Only full http(s) links with no user name or password, so relative links
  // ("/watch?v=…", "youtube.com/…") are rejected too. A real YouTube link also never has
  // an unusual port.
  const parsed = parseExternalUrl(url)
  if (!parsed || parsed.port) return null

  const host = parsed.hostname
  // "/shorts/abc/" -> ['shorts', 'abc'] (trailing slashes are fine). Popping the empty parts
  // stays fast on a path of thousands of slashes, where a /\/+$/ regex takes seconds.
  const segments = parsed.pathname.split('/').slice(1)
  while (segments.at(-1) === '') segments.pop()

  if (host === SHORT_HOST) {
    return segments.length === 1 ? idOrNull(segments[0]) : null
  }

  if (MAIN_HOSTS.has(host)) {
    if (segments.length === 1 && segments[0] === 'watch') {
      return idOrNull(parsed.searchParams.get('v'))
    }
    if (segments.length === 2 && ID_PATH_PREFIXES.has(segments[0])) {
      return idOrNull(segments[1])
    }
    return null
  }

  if (NOCOOKIE_HOSTS.has(host)) {
    return segments.length === 2 && segments[0] === 'embed' ? idOrNull(segments[1]) : null
  }

  return null
}

/** The privacy-friendly embed address for an <iframe>, or null if `id` isn't a valid ID. */
export function youtubeEmbedUrl(id: string): string | null {
  if (!isYouTubeId(id)) return null
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
}

/** The video's thumbnail image (480×360), or null if `id` isn't a valid ID. */
export function youtubeThumb(id: string): string | null {
  if (!isYouTubeId(id)) return null
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
}

/** A clean "watch on YouTube" link for the video, or null if `id` isn't a valid ID. */
export function youtubeWatchUrl(id: string): string | null {
  if (!isYouTubeId(id)) return null
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
}
