import { cn } from '../../lib/cn'
import { hostLabel, safeExternalUrl } from '../../lib/url'
import { getYouTubeId, youtubeEmbedUrl } from '../../lib/youtube'
import { ExternalButtonLink } from '../ui/ExternalLink'
import { IconPlay } from '../ui/icons'

type VideoEmbedProps = {
  /** The video link from the database (showcase video, or a record's video). */
  url: string | null | undefined
  /** The player's accessible name, e.g. "Sample Level 1 — showcase video". */
  title: string
  className?: string
}

/** Permissions the YouTube player needs; nothing else (no camera, microphone, …). */
const PLAYER_PERMISSIONS =
  'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'

/**
 * Shows a video:
 * - a YouTube link → the privacy-friendly youtube-nocookie player in a 16:9 box, loaded only
 *   when it scrolls near (only the parsed video ID is ever put in the iframe address);
 * - any other safe http(s) link (Medal, Twitch, Drive…) → a "Watch video ↗" button that opens
 *   it in a new tab — other sites are never embedded;
 * - no link, or an unsafe one → nothing at all (renders null).
 */
export function VideoEmbed({ url, title, className }: VideoEmbedProps) {
  const id = getYouTubeId(url)
  const embedSrc = id ? youtubeEmbedUrl(id) : null

  if (embedSrc) {
    return (
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-lg shadow-black/30',
          className,
        )}
      >
        <iframe
          src={embedSrc}
          title={title}
          loading="lazy"
          allow={PLAYER_PERMISSIONS}
          allowFullScreen
          // YouTube refuses to play embeds that arrive without a referrer (error 153).
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    )
  }

  if (!safeExternalUrl(url)) return null
  const host = hostLabel(url)

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-8 text-center',
        className,
      )}
    >
      <p className="text-sm text-muted">
        This video is on <span className="font-medium text-text">{host ?? 'another site'}</span>, so
        it opens there.
      </p>
      <ExternalButtonLink href={url} variant="secondary" leftIcon={<IconPlay />}>
        Watch video
      </ExternalButtonLink>
    </div>
  )
}
