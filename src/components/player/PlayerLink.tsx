import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { playerPath } from '../../lib/paths'
import { CountryFlag } from './CountryFlag'
import { PlayerAvatar } from './PlayerAvatar'
import type { AvatarSize } from './player-visuals'

export type PlayerLinkPlayer = {
  name: string
  slug: string
  id?: string
  avatar_path?: string | null
  country_code?: string | null
}

type PlayerLinkProps = {
  /** Any player-shaped object (a `Player` works as it is). */
  player: PlayerLinkPlayer
  /** Show the avatar / initials before the name. Default true. */
  showAvatar?: boolean
  /** Show the country flag after the name (when the player has one). Default true. */
  showFlag?: boolean
  avatarSize?: AvatarSize
  className?: string
}

/**
 * Avatar + name linking to /player/:slug, with the flag after the link. The link's accessible
 * name is just the player's name (the avatar is decorative and the flag sits outside the
 * link). The link is at least 40px tall, so it is easy to tap in tables and lists.
 */
export function PlayerLink({
  player,
  showAvatar = true,
  showFlag = true,
  avatarSize = 'sm',
  className,
}: PlayerLinkProps) {
  return (
    <span className={cn('inline-flex max-w-full min-w-0 items-center gap-2', className)}>
      <Link
        to={playerPath(player.slug)}
        className="group/player inline-flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg font-semibold text-text transition-colors hover:text-accent-soft"
      >
        {showAvatar ? <PlayerAvatar player={player} size={avatarSize} /> : null}
        <span className="truncate underline decoration-transparent underline-offset-[3px] transition-colors group-hover/player:decoration-accent-soft">
          {player.name}
        </span>
      </Link>
      {showFlag ? <CountryFlag code={player.country_code} /> : null}
    </span>
  )
}
