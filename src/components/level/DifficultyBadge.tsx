import { cn } from '../../lib/cn'
import { difficultyLabel } from '../../lib/format'
import type { GdDifficulty } from '../../types/models'
import { DIFFICULTY_METER_STEPS, difficultyVisual } from './level-visuals'

type DifficultyBadgeSize = 'sm' | 'md'

type DifficultyBadgeProps = {
  difficulty: GdDifficulty
  size?: DifficultyBadgeSize
  /**
   * Hide the words and show only the 5-step meter (e.g. a tight table cell on phones).
   * The meter then becomes an image named "Extreme Demon" (also shown as a tooltip).
   */
  hideLabel?: boolean
  className?: string
}

const SIZES: Record<DifficultyBadgeSize, string> = {
  sm: 'gap-1.5 px-2 py-0.5 text-xs',
  md: 'gap-2 px-2.5 py-1 text-sm',
}

const MARK_SIZES: Record<DifficultyBadgeSize, string> = {
  sm: 'h-2 w-[0.4375rem]',
  md: 'h-2.5 w-[0.5625rem]',
}

/**
 * A level's in-game difficulty as our own badge (never RobTop's face art): a 5-step meter plus
 * the name. Demons use red spike marks; other difficulties use round marks in calmer colours, so
 * the two groups are easy to tell apart even without colour. The words are always there for
 * screen readers.
 */
export function DifficultyBadge({
  difficulty,
  size = 'sm',
  hideLabel = false,
  className,
}: DifficultyBadgeProps) {
  const label = difficultyLabel(difficulty)
  const visual = difficultyVisual(difficulty)

  return (
    <span
      data-difficulty={difficulty}
      data-demon={visual.shape === 'spike' ? 'true' : 'false'}
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        visual.tone,
        SIZES[size],
        hideLabel && 'px-2',
        className,
      )}
    >
      <span
        role={hideLabel ? 'img' : undefined}
        aria-label={hideLabel ? label : undefined}
        aria-hidden={hideLabel ? undefined : true}
        title={hideLabel ? label : undefined}
        className="inline-flex items-end gap-px"
      >
        {Array.from({ length: DIFFICULTY_METER_STEPS }, (_, i) => (
          <DifficultyMark
            key={i}
            shape={visual.shape}
            filled={i < visual.tier}
            className={cn(MARK_SIZES[size], i < visual.tier ? visual.meterTone : 'opacity-30')}
          />
        ))}
      </span>
      {hideLabel ? null : <span>{label}</span>}
    </span>
  )
}

function DifficultyMark({
  shape,
  filled,
  className,
}: {
  shape: 'orb' | 'spike'
  filled: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 8 9"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0 overflow-visible', className)}
    >
      {shape === 'spike' ? (
        <path
          d="M4 0.75 7.5 8.25H0.5Z"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx="4"
          cy="5"
          r="3"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1}
        />
      )}
    </svg>
  )
}
