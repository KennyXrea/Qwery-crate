/** Helpers behind the player components' looks (kept out of the .tsx files). */
import { hashString } from '../../lib/hash'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Box size + initials text size. xs 24px · sm 32px · md 40px · lg 64px · xl 96px. */
export const AVATAR_SIZES: Readonly<Record<AvatarSize, { box: string; text: string; px: number }>> =
  {
    xs: { box: 'size-6', text: 'text-[0.625rem]', px: 24 },
    sm: { box: 'size-8', text: 'text-xs', px: 32 },
    md: { box: 'size-10', text: 'text-sm', px: 40 },
    lg: { box: 'size-16', text: 'text-xl', px: 64 },
    xl: { box: 'size-24', text: 'text-3xl', px: 96 },
  }

/** Initials-avatar colours (theme tokens only); each player always gets the same one. */
const AVATAR_TONES = [
  'border-accent/35 bg-accent/15 text-accent-soft',
  'border-gold/35 bg-gold/10 text-gold',
  'border-silver/35 bg-silver/10 text-silver',
  'border-bronze/35 bg-bronze/10 text-bronze',
  'border-success/35 bg-success/10 text-success',
  'border-accent-soft/35 bg-accent-strong/25 text-text',
] as const

/** The initials avatar colour for a player (pass their id, or name if there's no id). */
export function avatarTone(seed: string): string {
  return AVATAR_TONES[hashString(seed) % AVATAR_TONES.length] ?? AVATAR_TONES[0]
}
