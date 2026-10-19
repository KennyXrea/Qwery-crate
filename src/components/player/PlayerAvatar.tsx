import { useState } from 'react'
import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/format'
import { playerAvatarUrl } from '../../lib/media'
import { AVATAR_SIZES, avatarTone } from './player-visuals'
import type { AvatarSize } from './player-visuals'

export type PlayerAvatarPlayer = {
  name: string
  id?: string
  avatar_path?: string | null
}

type PlayerAvatarProps = {
  /** Any player-shaped object (a `Player` works as it is). */
  player: PlayerAvatarPlayer
  /** xs 24px · sm 32px · md 40px (default) · lg 64px · xl 96px. */
  size?: AvatarSize
  /**
   * Default true: the avatar sits next to the player's name, so screen readers skip it.
   * Set false when it stands alone; it is then announced as "<name>'s avatar".
   */
  decorative?: boolean
  className?: string
}

/**
 * A round player picture: their uploaded avatar, or their initials on a colour picked from
 * their id when there is none (or it fails to load).
 */
export function PlayerAvatar({
  player,
  size = 'md',
  decorative = true,
  className,
}: PlayerAvatarProps) {
  const src = playerAvatarUrl(player)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const { box, text, px } = AVATAR_SIZES[size]
  const label = `${player.name}'s avatar`

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={decorative ? '' : label}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn(
          'shrink-0 rounded-full border border-border bg-surface-2 object-cover',
          box,
          className,
        )}
      />
    )
  }

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-display leading-none font-semibold select-none',
        avatarTone(player.id ?? player.name),
        box,
        text,
        className,
      )}
    >
      {initialsOf(player.name)}
    </span>
  )
}
