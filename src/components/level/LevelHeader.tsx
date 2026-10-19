import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import type { Level } from '../../types/models'
import { IconChevronLeft } from '../ui/icons'
import { TEXT_LINK } from '../ui/link-styles'
import { RankNumber } from '../ui/RankNumber'
import { listPathForSection } from './level-detail'
import { LevelThumbnail } from './LevelThumbnail'
import { SectionBadge } from './SectionBadge'

export type LevelHeaderLevel = Pick<
  Level,
  | 'id'
  | 'name'
  | 'position'
  | 'section'
  | 'creator'
  | 'verifier'
  | 'description'
  | 'thumbnail_path'
  | 'showcase_video_url'
  | 'first_victor_video_url'
>

type LevelHeaderProps = {
  level: LevelHeaderLevel
  /**
   * Show the level's picture beside the title. The page turns it on when no video plays on
   * the page, so there is always something to look at.
   */
  showThumbnail?: boolean
  className?: string
}

/**
 * The top of a level page: a link back to the level's section of the list, the rank and
 * section, the name (the page's only <h1>), "by Creator · verified by Verifier" and the
 * description.
 */
export function LevelHeader({ level, showThumbnail = false, className }: LevelHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <Link to={listPathForSection(level.section)} className={cn(TEXT_LINK, 'text-sm')}>
        <IconChevronLeft />
        Back to the list
      </Link>

      <div
        className={cn(
          'grid gap-5',
          showThumbnail &&
            'sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center md:grid-cols-[17rem_minmax(0,1fr)] md:gap-6',
        )}
      >
        {showThumbnail ? (
          <LevelThumbnail level={level} loading="eager" className="w-full max-w-md" />
        ) : null}

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RankNumber rank={level.position} size="lg" />
            <SectionBadge section={level.section} size="md" />
          </div>
          <h1 className="text-3xl font-bold wrap-break-word text-text sm:text-4xl lg:text-5xl">
            {level.name}
          </h1>
          <LevelByline creator={level.creator} verifier={level.verifier} />
          {level.description ? (
            <p className="max-w-2xl whitespace-pre-line text-muted">{level.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** "by Creator · verified by Verifier"; either half is left out when unknown. */
function LevelByline({ creator, verifier }: { creator: string | null; verifier: string | null }) {
  if (!creator && !verifier) return null

  return (
    <p className="wrap-break-word text-muted">
      {creator ? (
        <>
          by <span className="font-semibold text-text">{creator}</span>
        </>
      ) : null}
      {creator && verifier ? (
        <>
          {' '}
          <span aria-hidden="true" className="mx-1 text-border-strong">
            ·
          </span>{' '}
        </>
      ) : null}
      {verifier ? (
        <>
          verified by <span className="font-semibold text-text">{verifier}</span>
        </>
      ) : null}
    </p>
  )
}
