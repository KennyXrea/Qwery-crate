import {
  EMPTY_VALUE,
  formatAverage,
  formatDate,
  formatDuration,
  formatNumber,
  formatPoints,
} from '../../lib/format'
import type { Level } from '../../types/models'
import { PlayerLink } from '../player/PlayerLink'
import { StatGrid } from '../shared/StatGrid'
import { StatTile } from '../shared/StatTile'
import { CopyLevelIdButton } from './CopyLevelIdButton'
import { DifficultyBadge } from './DifficultyBadge'
import { WIDE_ON_PHONES, firstVictorTileSpan } from './level-detail'

export type LevelStatGridLevel = Pick<
  Level,
  | 'gd_level_id'
  | 'difficulty'
  | 'difficulty_rating'
  | 'points'
  | 'points_override'
  | 'section'
  | 'length_seconds'
  | 'victor_count'
  | 'avg_enjoyment'
  | 'avg_attempts'
  | 'first_victor_id'
  | 'first_victor_name'
  | 'first_victor_slug'
  | 'first_victory_date'
>

type LevelStatGridProps = {
  level: LevelStatGridLevel
  className?: string
}

/**
 * The level's facts as tiles: GD level ID (with a copy button; left out when unknown), in-game
 * difficulty, our difficulty rating, points, length, victors, average enjoyment and attempts,
 * and the first victor. Unknown values show "—".
 */
export function LevelStatGrid({ level, className }: LevelStatGridProps) {
  const hasGdLevelId = level.gd_level_id !== null

  return (
    <StatGrid columns={3} label="Level stats" className={className}>
      {level.gd_level_id !== null ? (
        <StatTile
          label="GD level ID"
          className={WIDE_ON_PHONES}
          value={String(level.gd_level_id)}
          action={<CopyLevelIdButton gdLevelId={level.gd_level_id} className="-my-2" />}
        />
      ) : null}
      <StatTile
        label="In-game difficulty"
        className={WIDE_ON_PHONES}
        mono={false}
        value={<DifficultyBadge difficulty={level.difficulty} size="md" />}
      />
      <StatTile
        label="Our difficulty rating"
        value={formatNumber(level.difficulty_rating)}
        hint={level.difficulty_rating === null ? 'Not rated yet' : undefined}
      />
      <StatTile label="Points" value={formatPoints(level.points)} hint={pointsHint(level)} />
      <StatTile label="Length" value={formatDuration(level.length_seconds)} />
      <StatTile label="Victors" value={formatNumber(level.victor_count)} />
      <StatTile
        label="Avg enjoyment"
        value={formatAverage(level.avg_enjoyment)}
        hint={level.avg_enjoyment === null ? 'No ratings yet' : 'out of 10'}
      />
      <StatTile
        label="Avg attempts"
        value={
          level.avg_attempts === null ? EMPTY_VALUE : formatNumber(Math.round(level.avg_attempts))
        }
      />
      <StatTile
        label="First victor"
        mono={false}
        className={firstVictorTileSpan(hasGdLevelId)}
        value={
          level.first_victor_name && level.first_victor_slug ? (
            <PlayerLink
              player={{
                name: level.first_victor_name,
                slug: level.first_victor_slug,
                id: level.first_victor_id ?? undefined,
              }}
              avatarSize="xs"
              className="-my-2 align-middle"
            />
          ) : (
            <span className="font-medium text-muted">Nobody yet</span>
          )
        }
        hint={
          level.first_victory_date ? (
            <time dateTime={level.first_victory_date}>{formatDate(level.first_victory_date)}</time>
          ) : undefined
        }
      />
    </StatGrid>
  )
}

/** Explains points that don't come from the formula. */
function pointsHint(level: LevelStatGridLevel): string | undefined {
  if (level.section === 'legacy') return 'Legacy levels give no points'
  if (level.points_override !== null) return 'Set by hand (override)'
  return undefined
}
