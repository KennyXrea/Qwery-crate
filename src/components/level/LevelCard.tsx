import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { EMPTY_VALUE, formatAverage, formatNumber, formatPoints } from '../../lib/format'
import { levelPath } from '../../lib/paths'
import type { Level } from '../../types/models'
import { Card } from '../ui/Card'
import { STRETCHED_LINK } from '../ui/card-link'
import { IconArrowRight, IconStar, IconUsers } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { DifficultyBadge } from './DifficultyBadge'
import {
  LEVEL_CARD_ARROW,
  LEVEL_CARD_GRID,
  LEVEL_CARD_STATS,
  LEVEL_CARD_THUMB,
  LEVEL_CARD_TITLE,
} from './level-visuals'
import { LevelThumbnail } from './LevelThumbnail'
import { SectionBadge } from './SectionBadge'

/** The level fields a card shows (any `Level` has them). */
export type LevelCardLevel = Pick<
  Level,
  | 'id'
  | 'name'
  | 'slug'
  | 'position'
  | 'creator'
  | 'difficulty'
  | 'section'
  | 'points'
  | 'victor_count'
  | 'avg_enjoyment'
  | 'thumbnail_path'
  | 'showcase_video_url'
  | 'first_victor_video_url'
>

type LevelCardProps = {
  level: LevelCardLevel
  /** The card's element. Default 'li' — put cards in an <ol>; use 'div' / 'article' elsewhere. */
  as?: 'li' | 'div' | 'article'
  /** Heading level of the level name, to fit the page outline. Default 'h2'. */
  titleAs?: 'h2' | 'h3'
  /** Also show the Main / Extended / Legacy badge (useful outside the sectioned list). */
  showSection?: boolean
  /** 'eager' for cards at the very top of a page. Default 'lazy'. */
  thumbnailLoading?: 'lazy' | 'eager'
  className?: string
}

/**
 * One level in the card view: thumbnail on the left, "#N Name", "by Creator", then the
 * difficulty, points, victor count and average enjoyment. The whole card is one link to the
 * level page (the name is the real link; see STRETCHED_LINK), so its accessible name is just
 * the level's name.
 */
export function LevelCard({
  level,
  as = 'li',
  titleAs: Title = 'h2',
  showSection = false,
  thumbnailLoading = 'lazy',
  className,
}: LevelCardProps) {
  const victors = level.victor_count

  return (
    <Card as={as} padding="none" interactive className={cn('group relative p-3 sm:p-4', className)}>
      <div className={LEVEL_CARD_GRID}>
        <LevelThumbnail level={level} loading={thumbnailLoading} className={LEVEL_CARD_THUMB} />

        <div className={LEVEL_CARD_TITLE}>
          <div className="flex min-w-0 items-baseline gap-2.5">
            <RankNumber rank={level.position} className="shrink-0" />
            <Title className="line-clamp-2 min-w-0 text-base leading-snug font-semibold text-text sm:line-clamp-1 sm:text-lg">
              <Link to={levelPath(level.slug)} className={STRETCHED_LINK}>
                {level.name}
              </Link>
            </Title>
          </div>
          {level.creator ? (
            <p className="mt-1 truncate text-sm text-muted">
              by <span className="text-text">{level.creator}</span>
            </p>
          ) : null}
        </div>

        <dl
          className={cn(
            LEVEL_CARD_STATS,
            'flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted',
          )}
        >
          <div>
            <dt className="sr-only">Difficulty</dt>
            <dd>
              <DifficultyBadge difficulty={level.difficulty} />
            </dd>
          </div>
          {showSection ? (
            <div>
              <dt className="sr-only">Section</dt>
              <dd>
                <SectionBadge section={level.section} />
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Points</dt>
            <dd className="font-mono font-semibold text-text tabular-nums">
              {formatPoints(level.points)}
              <span aria-hidden="true" className="font-sans text-xs font-normal text-muted">
                {' pts'}
              </span>
              <span className="sr-only"> points</span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Victors</dt>
            <dd className="flex items-center gap-1.5">
              <IconUsers className="size-4" />
              <span>
                <span className="font-mono text-text tabular-nums">{formatNumber(victors)}</span>{' '}
                {victors === 1 ? 'victor' : 'victors'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Average enjoyment</dt>
            <dd className="flex items-center gap-1.5" title="Average enjoyment (out of 10)">
              <IconStar className="size-4 text-gold" />
              {level.avg_enjoyment === null ? (
                <>
                  <span aria-hidden="true">{EMPTY_VALUE}</span>
                  <span className="sr-only">Not rated yet</span>
                </>
              ) : (
                <span className="font-mono text-text tabular-nums">
                  {formatAverage(level.avg_enjoyment)}
                  <span className="sr-only"> out of 10</span>
                </span>
              )}
            </dd>
          </div>
        </dl>

        <IconArrowRight
          className={cn(LEVEL_CARD_ARROW, 'text-muted transition-colors group-hover:text-accent')}
        />
      </div>
    </Card>
  )
}
