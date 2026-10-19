import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { formatCount, formatDate } from '../../lib/format'
import { levelPath, playerPath } from '../../lib/paths'
import { safeExternalUrl } from '../../lib/url'
import type { RecentChange } from '../../types/models'
import { ExternalLink } from '../ui/ExternalLink'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrophy } from '../ui/icons'
import { INLINE_LINK } from '../ui/link-styles'
import { RECENT_CHANGE_ICON, RECENT_CHANGE_ROW, moveOf, recentChangeTone } from './shared-visuals'

type RecentChangeItemProps = {
  change: RecentChange
  /** Show the day under the line (for short lists; the full feed groups by day instead). */
  showDate?: boolean
  /** Default 'li' — put items in an <ol>/<ul>. */
  as?: 'li' | 'div'
  className?: string
}

/**
 * One line of the Recent changes feed, with an icon for its kind:
 * - "**Player** beat **Level** (12,000 attempts, video ↗)"
 * - "**Level** was added at #N"
 * - "**Level** moved from #A to #B ↑ up 3" — green going up, red going down; the words
 *   "up 3" / "down 2" are always there, so colour is never the only signal.
 */
export function RecentChangeItem({
  change,
  showDate = false,
  as: Element = 'li',
  className,
}: RecentChangeItemProps) {
  return (
    <Element data-kind={change.kind} className={cn(RECENT_CHANGE_ROW, className)}>
      <span aria-hidden="true" className={cn(RECENT_CHANGE_ICON, recentChangeTone(change))}>
        <ChangeIcon change={change} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm leading-6 break-words text-muted">
          <ChangeSentence change={change} />
        </p>
        {showDate ? (
          <p className="text-xs text-muted">
            <time dateTime={change.event_date}>{formatDate(change.event_date)}</time>
          </p>
        ) : null}
      </div>
    </Element>
  )
}

function ChangeIcon({ change }: { change: RecentChange }) {
  if (change.kind === 'record') return <IconTrophy />
  if (change.kind === 'level_added') return <IconPlus />
  return moveOf(change).direction === 'down' ? <IconArrowDown /> : <IconArrowUp />
}

function LevelName({ change }: { change: RecentChange }) {
  return (
    <Link to={levelPath(change.level_slug)} className={INLINE_LINK}>
      {change.level_name}
    </Link>
  )
}

function Position({ value }: { value: number }) {
  return <span className="font-mono font-semibold text-text tabular-nums">#{value}</span>
}

function ChangeSentence({ change }: { change: RecentChange }) {
  switch (change.kind) {
    case 'record': {
      const attempts = change.attempts === null ? null : formatCount(change.attempts, 'attempt')
      const hasVideo = safeExternalUrl(change.video_url) !== null
      return (
        <>
          <Link to={playerPath(change.player_slug)} className={INLINE_LINK}>
            {change.player_name}
          </Link>{' '}
          beat <LevelName change={change} />
          {attempts || hasVideo ? (
            <>
              {' ('}
              {attempts ? <span className="whitespace-nowrap">{attempts}</span> : null}
              {attempts && hasVideo ? ', ' : null}
              {hasVideo ? (
                <ExternalLink href={change.video_url} className="whitespace-nowrap">
                  video
                </ExternalLink>
              ) : null}
              {')'}
            </>
          ) : null}
        </>
      )
    }
    case 'level_added':
      return (
        <>
          <LevelName change={change} /> was added at <Position value={change.new_position} />
        </>
      )
    case 'level_moved': {
      const { direction, places } = moveOf(change)
      return (
        <>
          <LevelName change={change} /> moved from <Position value={change.old_position} /> to{' '}
          <Position value={change.new_position} />
          {direction === 'none' ? null : (
            <>
              {' '}
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 align-[0.0625rem] text-xs leading-5 font-semibold whitespace-nowrap',
                  direction === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                )}
              >
                {direction === 'up' ? (
                  <IconArrowUp className="size-3" />
                ) : (
                  <IconArrowDown className="size-3" />
                )}
                {direction} {places}
              </span>
            </>
          )}
        </>
      )
    }
  }
}
