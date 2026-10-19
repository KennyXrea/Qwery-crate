import { usePlayer } from '../../hooks/usePlayer'
import { usePlayers } from '../../hooks/usePlayers'
import { Select } from '../ui/Select'
import { playerFilterOptions } from './list-options'

type PlayerFilterProps = {
  /** The selected player's slug (?player=…), or null for everyone. */
  slug: string | null
  onChange: (slug: string | null) => void
  className?: string
}

/** Max players the leaderboard API returns at once; plenty for a friend group. */
const PLAYER_OPTIONS_LIMIT = 100

/**
 * "Beaten by": shows only the levels one player has beaten. The choices are the players with
 * at least one completion (A–Z); the value is the player's slug, as in the URL.
 */
export function PlayerFilter({ slug, onChange, className }: PlayerFilterProps) {
  const { data: players } = usePlayers({ pageSize: PLAYER_OPTIONS_LIMIT })
  const { data: selected } = usePlayer(slug)
  const options = playerFilterOptions(players?.rows ?? [], slug, selected ?? null)

  return (
    <Select
      label="Beaten by"
      placeholder="Any player"
      options={options}
      value={slug ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      className={className}
    />
  )
}
