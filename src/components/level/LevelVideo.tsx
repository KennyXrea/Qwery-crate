import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { playerPath } from '../../lib/paths'
import { INLINE_LINK } from '../ui/link-styles'
import type { LevelVideoPick } from './level-detail'
import { VideoEmbed } from './VideoEmbed'

type LevelVideoProps = {
  /** From pickLevelVideo(level): the showcase video, else the first victor's video. */
  video: LevelVideoPick
  levelName: string
  className?: string
}

/**
 * The level page's video with a caption saying what it is. YouTube plays on the page (the
 * privacy-friendly player); any other site gets a "Watch video ↗" button (see VideoEmbed).
 */
export function LevelVideo({ video, levelName, className }: LevelVideoProps) {
  const victor = video.source === 'first_victor' ? video.playerName : null
  const title =
    video.source === 'showcase'
      ? `${levelName} — showcase video`
      : `${levelName} — first victory${victor ? ` by ${victor}` : ''}`

  return (
    <figure className={cn('space-y-2', className)}>
      <VideoEmbed url={video.url} title={title} />
      <figcaption className="text-sm text-muted">
        {video.source === 'showcase' ? (
          'Showcase video'
        ) : (
          <>
            No showcase video yet, so here is the first victory
            {victor ? (
              <>
                {' by '}
                {video.playerSlug ? (
                  <Link to={playerPath(video.playerSlug)} className={INLINE_LINK}>
                    {victor}
                  </Link>
                ) : (
                  <span className="font-semibold text-text">{victor}</span>
                )}
              </>
            ) : null}
            .
          </>
        )}
      </figcaption>
    </figure>
  )
}
