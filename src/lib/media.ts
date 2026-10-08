import { getEnv } from './env'
import { getYouTubeId, youtubeThumb } from './youtube'

/** The public Supabase Storage bucket for level thumbnails and player avatars. */
export const MEDIA_BUCKET = 'media'

/** Anything that starts like "https:", "data:" or "javascript:". */
const HAS_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/

/**
 * The public address of a file in the media bucket, e.g. "levels/<id>/123.webp" →
 * "https://<project>.supabase.co/storage/v1/object/public/media/levels/<id>/123.webp".
 * Returns null for an empty path, a full URL, a path with empty, "." or ".." parts, or text
 * that cannot be put in a URL.
 * `baseUrl` defaults to the Supabase project URL (read only when needed, so tests can pass one).
 */
export function publicMediaUrl(path: string | null | undefined, baseUrl?: string): string | null {
  if (typeof path !== 'string' || path.trim() === '') return null
  if (HAS_SCHEME.test(path)) return null

  const segments = path.split('/')
  // Catches a leading or trailing "/", "//" and attempts to climb out of the bucket.
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null
  }

  let encoded: string
  try {
    encoded = segments.map(encodeURIComponent).join('/')
  } catch {
    // URIError: the text has half of an emoji (a lone surrogate) and can't be put in a URL.
    return null
  }

  const base = (baseUrl ?? getEnv().supabaseUrl).replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`
}

/** The columns levelThumbnail reads (levels_view has all three). */
export type LevelThumbnailFields = {
  thumbnail_path?: string | null
  showcase_video_url?: string | null
  first_victor_video_url?: string | null
}

export type LevelThumbnail =
  { kind: 'image'; src: string; source: 'upload' | 'youtube' } | { kind: 'placeholder' }

/**
 * Picks a level's picture: the uploaded image, else the showcase video's YouTube thumbnail,
 * else the first victor's YouTube thumbnail, else a placeholder (drawn by the page, not an
 * image). Videos that aren't on YouTube are skipped.
 */
export function levelThumbnail(level: LevelThumbnailFields, baseUrl?: string): LevelThumbnail {
  const uploaded = publicMediaUrl(level.thumbnail_path, baseUrl)
  if (uploaded) return { kind: 'image', src: uploaded, source: 'upload' }

  for (const videoUrl of [level.showcase_video_url, level.first_victor_video_url]) {
    const id = getYouTubeId(videoUrl)
    const src = id ? youtubeThumb(id) : null
    if (src) return { kind: 'image', src, source: 'youtube' }
  }

  return { kind: 'placeholder' }
}

/** A player's uploaded avatar, or null when they have none (show initials instead). */
export function playerAvatarUrl(
  player: { avatar_path?: string | null },
  baseUrl?: string,
): string | null {
  return publicMediaUrl(player.avatar_path, baseUrl)
}
