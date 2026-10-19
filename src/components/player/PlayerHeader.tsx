import { countryName } from '../../lib/country'
import { hostLabel } from '../../lib/url'
import type { Player } from '../../types/models'
import { Badge } from '../ui/Badge'
import { ExternalButtonLink } from '../ui/ExternalLink'
import { IconTrophy } from '../ui/icons'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton, SkeletonText } from '../ui/Skeleton'
import { CountryFlag } from './CountryFlag'
import { PlayerAvatar } from './PlayerAvatar'

/** The player fields the header shows (any `Player` has them). */
export type PlayerHeaderPlayer = Pick<
  Player,
  'id' | 'name' | 'avatar_path' | 'rank' | 'country_code' | 'channel_url' | 'bio'
>

type PlayerHeaderProps = {
  player: PlayerHeaderPlayer
}

/** The avatar is 64px on phones and 96px from `sm` up (the same box the skeleton uses). */
const AVATAR_CLASSES = 'sm:size-24 sm:text-3xl'

/**
 * The top of a player's page: avatar, name (the page's <h1>), rank, country and channel link
 * (only a safe http(s) link, opened in a new tab) and their bio.
 */
export function PlayerHeader({ player }: PlayerHeaderProps) {
  const country = countryName(player.country_code)
  const channelHost = hostLabel(player.channel_url)

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-4 sm:gap-6">
        <PlayerAvatar player={player} size="lg" className={AVATAR_CLASSES} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
              Player
            </p>
            <h1 className="text-3xl font-bold wrap-break-word text-text sm:text-4xl">
              {player.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {player.rank === null ? (
              <Badge size="md">Unranked</Badge>
            ) : (
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3">
                <IconTrophy className="size-4 text-gold" />
                <RankNumber rank={player.rank} size="sm" />
              </span>
            )}
            {country ? (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface-2 px-3 text-text">
                <span aria-hidden="true" className="inline-flex">
                  <CountryFlag code={player.country_code} />
                </span>
                {country}
              </span>
            ) : null}
          </div>

          {player.bio ? (
            <p className="max-w-2xl break-words whitespace-pre-line text-muted">{player.bio}</p>
          ) : null}
        </div>
      </div>

      {channelHost ? (
        <ExternalButtonLink
          href={player.channel_url}
          variant="secondary"
          size="sm"
          className="self-start sm:shrink-0"
        >
          Channel
          <span className="font-normal text-muted">{channelHost}</span>
        </ExternalButtonLink>
      ) : null}
    </div>
  )
}

/** A PlayerHeader-shaped loading placeholder (hidden from screen readers). */
export function PlayerHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-start gap-4 sm:gap-6">
      <Skeleton rounded="full" className="size-16 shrink-0 sm:size-24" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-9 w-56 max-w-full sm:h-10" />
        </div>
        <div className="flex gap-2">
          <Skeleton rounded="full" className="h-8 w-16" />
          <Skeleton rounded="full" className="h-8 w-32" />
        </div>
        <SkeletonText lines={2} className="max-w-xl" />
      </div>
    </div>
  )
}
