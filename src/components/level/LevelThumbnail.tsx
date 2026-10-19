import { useState } from 'react'
import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/format'
import type { LevelThumbnailFields } from '../../lib/media'
import {
  PLACEHOLDER_DOTS,
  PLACEHOLDER_GROUND_Y,
  placeholderScene,
  thumbnailSources,
} from './level-visuals'

export type LevelThumbnailLevel = LevelThumbnailFields & { id: string; name: string }

type LevelThumbnailProps = {
  /** Any level-shaped object (a `Level` works as it is). */
  level: LevelThumbnailLevel
  /** Set the width here (e.g. "w-28 sm:w-48" or "w-full"); the height follows at 16:9. */
  className?: string
  /** 'eager' only for the one big picture at the top of a page. Default 'lazy'. */
  loading?: 'lazy' | 'eager'
}

/**
 * A level's 16:9 picture: its uploaded thumbnail, else a YouTube thumbnail of its showcase or
 * first-victor video (levelThumbnail()'s chain), else a placeholder drawn just for this level.
 * The box has a fixed aspect ratio and the placeholder sits underneath the image, so nothing
 * shifts while it loads. If an image fails to load, the next one in the chain is tried.
 */
export function LevelThumbnail({ level, className, loading = 'lazy' }: LevelThumbnailProps) {
  const [failed, setFailed] = useState<readonly string[]>([])
  const src = thumbnailSources(level).find((source) => !failed.includes(source)) ?? null

  return (
    <div
      className={cn(
        'relative aspect-video shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/5 ring-inset',
        className,
      )}
    >
      {/* Always drawn underneath, so it shows while the image loads and if every image fails. */}
      <ThumbnailPlaceholder seed={level.id || level.name} name={level.name} />
      {src ? (
        <img
          key={src}
          src={src}
          alt={`${level.name} thumbnail`}
          width={480}
          height={270}
          loading={loading}
          decoding="async"
          onError={() => setFailed((current) => [...current, src])}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </div>
  )
}

/** The level's own drawing: theme-blue glow, dot grid, ground spikes, a cube and initials. */
function ThumbnailPlaceholder({ seed, name }: { seed: string; name: string }) {
  const scene = placeholderScene(seed)
  const ground = PLACEHOLDER_GROUND_Y

  return (
    <div aria-hidden="true" className="@container absolute inset-0" style={scene.background}>
      <div className="absolute inset-0" style={PLACEHOLDER_DOTS} />
      <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
        className="absolute inset-0 size-full"
      >
        <rect x="0" y={ground} width="160" height={90 - ground} className="fill-bg/55" />
        <path d={`M0 ${ground}H160`} className="stroke-accent/45" strokeWidth={0.75} />
        {scene.spikes.map((x) => (
          <path
            key={x}
            d={`M${x} ${ground}L${x + 5} ${ground - 9}L${x + 10} ${ground}Z`}
            className="fill-bg/70 stroke-accent-soft/55"
            strokeWidth={0.75}
            strokeLinejoin="round"
          />
        ))}
        <g
          transform={`translate(${scene.cube.x} ${scene.cube.y}) rotate(${scene.cube.rotate} 5 5)`}
        >
          <rect
            width="10"
            height="10"
            rx="1.25"
            className="fill-accent-strong/45 stroke-accent-soft/70"
            strokeWidth={0.75}
          />
          <rect x="3" y="3" width="4" height="4" rx="0.5" className="fill-accent-soft/60" />
        </g>
      </svg>
      <span className="absolute inset-x-0 top-[38%] -translate-y-1/2 text-center font-display text-[clamp(0.875rem,19cqw,4.5rem)] leading-none font-bold tracking-tight text-white/85">
        {initialsOf(name)}
      </span>
    </div>
  )
}
