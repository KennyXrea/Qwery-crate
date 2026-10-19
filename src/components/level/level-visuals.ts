/**
 * Helpers behind the level components' looks (kept out of the .tsx files so those only export
 * components). Everything here is deterministic: the same level always looks the same.
 */
import type { CSSProperties } from 'react'
import { isDemon } from '../../lib/format'
import { hashString } from '../../lib/hash'
import { levelThumbnail, type LevelThumbnailFields } from '../../lib/media'
import type { GdDifficulty, LevelSection } from '../../types/models'

// ── Thumbnails ────────────────────────────────────────────────────────────────────────────────

/**
 * Every picture a level could show, best first, without duplicates — levelThumbnail()'s
 * fallback chain (uploaded image → showcase video's YouTube thumbnail → first victor's YouTube
 * thumbnail). LevelThumbnail shows the first one and moves to the next if it fails to load;
 * when none is left (or there never was one) it draws the placeholder.
 */
export function thumbnailSources(level: LevelThumbnailFields): string[] {
  const steps: LevelThumbnailFields[] = [
    level,
    { ...level, thumbnail_path: null },
    { ...level, thumbnail_path: null, showcase_video_url: null },
  ]
  const sources: string[] = []
  for (const step of steps) {
    const picked = levelThumbnail(step)
    if (picked.kind === 'image' && !sources.includes(picked.src)) sources.push(picked.src)
  }
  return sources
}

/** The placeholder drawing for a level without a picture (see LevelThumbnail). */
export type PlaceholderScene = {
  /** Background gradients (theme colours only), as an inline style. */
  background: CSSProperties
  /** Left edge (x) of each ground spike, in the 160 × 90 drawing. */
  spikes: number[]
  /** The little cube "player" hopping over the ground. */
  cube: { x: number; y: number; rotate: number }
}

const GLOW_COLORS = ['--color-accent', '--color-accent-soft', '--color-accent-strong'] as const
const TINT_COLORS = ['--color-accent-strong', '--color-accent', '--color-border-strong'] as const

/** The ground line's height in the 160 × 90 placeholder drawing. */
export const PLACEHOLDER_GROUND_Y = 76

/** Picks a whole number from 0 to size − 1 out of some bits of the hash. */
function pick(hash: number, shift: number, size: number): number {
  return (hash >>> shift) % size
}

/**
 * A level's own placeholder: a blue glow and tint, a few spikes and a cube on a ground line,
 * all placed from a hash of `seed` (use the level id). Different levels get different scenes;
 * the same level always gets the same one.
 */
export function placeholderScene(seed: string): PlaceholderScene {
  const a = hashString(seed)
  const b = hashString(`${seed}:scene`)

  const angle = pick(a, 0, 360)
  const glowX = 12 + pick(a, 9, 76)
  const glowY = 4 + pick(a, 16, 46)
  const glow = GLOW_COLORS[pick(a, 23, GLOW_COLORS.length)]
  const tint = TINT_COLORS[pick(a, 26, TINT_COLORS.length)]

  const spikeCount = 1 + pick(b, 0, 3)
  const spikeStart = 84 + pick(b, 2, 42)
  const spikes = Array.from({ length: spikeCount }, (_, i) => spikeStart + i * 10)

  return {
    background: {
      backgroundColor: 'var(--color-surface-2)',
      backgroundImage: [
        `radial-gradient(circle at ${glowX}% ${glowY}%, color-mix(in srgb, var(${glow}) 45%, transparent), transparent 62%)`,
        `linear-gradient(${angle}deg, var(--color-bg), color-mix(in srgb, var(${tint}) 32%, var(--color-surface)))`,
      ].join(', '),
    },
    spikes,
    cube: {
      x: 22 + pick(b, 9, 36),
      y: PLACEHOLDER_GROUND_Y - 10 - pick(b, 15, 14),
      rotate: pick(b, 20, 4) * 22.5,
    },
  }
}

/** The faint dot grid laid over placeholders (the site background's pattern, smaller). */
export const PLACEHOLDER_DOTS: CSSProperties = {
  backgroundImage:
    'radial-gradient(color-mix(in srgb, var(--color-white) 10%, transparent) 1px, transparent 1.3px)',
  backgroundSize: '12px 12px',
}

// ── Difficulty badges ─────────────────────────────────────────────────────────────────────────

/** How full the badge's 5-step meter is: tier within the non-demon or the demon group. */
const DIFFICULTY_TIER: Readonly<Record<GdDifficulty, number>> = {
  auto: 0,
  easy: 1,
  normal: 2,
  hard: 3,
  harder: 4,
  insane: 5,
  easy_demon: 1,
  medium_demon: 2,
  hard_demon: 3,
  insane_demon: 4,
  extreme_demon: 5,
}

/** Steps in the meter (filled up to the tier). */
export const DIFFICULTY_METER_STEPS = 5

/**
 * Badge colours. Non-demons use calm colours with round "orb" marks; demons are all red with
 * spike marks and get stronger toward Extreme. Text on each stays ≥ 4.5:1 on the surfaces.
 */
const DIFFICULTY_TONES: Readonly<Record<GdDifficulty, string>> = {
  auto: 'border-border bg-surface-2 text-muted',
  easy: 'border-success/30 bg-success/10 text-success',
  normal: 'border-accent/30 bg-accent/10 text-accent-soft',
  hard: 'border-gold/30 bg-gold/10 text-gold',
  harder: 'border-bronze/30 bg-bronze/10 text-bronze',
  insane: 'border-silver/40 bg-silver/10 text-silver',
  easy_demon: 'border-danger/25 bg-danger/5 text-danger',
  medium_demon: 'border-danger/35 bg-danger/10 text-danger',
  hard_demon: 'border-danger/45 bg-danger/10 text-danger',
  insane_demon: 'border-danger/60 bg-danger/15 text-danger',
  extreme_demon: 'border-danger/80 bg-danger/25 text-text',
}

export type DifficultyVisual = {
  /** Classes for the badge (border, background, text colour). */
  tone: string
  /** Classes for the meter's filled marks. */
  meterTone: string
  shape: 'orb' | 'spike'
  /** 0–5 filled marks. */
  tier: number
}

/** Everything DifficultyBadge needs to draw one difficulty. */
export function difficultyVisual(difficulty: GdDifficulty): DifficultyVisual {
  const demon = isDemon(difficulty)
  return {
    tone: DIFFICULTY_TONES[difficulty] ?? DIFFICULTY_TONES.auto,
    // Extreme Demon's label is white; its spikes stay red.
    meterTone: demon ? 'text-danger' : '',
    shape: demon ? 'spike' : 'orb',
    tier: DIFFICULTY_TIER[difficulty] ?? 0,
  }
}

// ── Section badges ────────────────────────────────────────────────────────────────────────────

export const SECTION_LABELS: Readonly<Record<LevelSection, string>> = {
  main: 'Main',
  extended: 'Extended',
  legacy: 'Legacy',
}

export const SECTION_TONES = {
  main: 'accent',
  extended: 'silver',
  legacy: 'neutral',
} as const satisfies Readonly<Record<LevelSection, string>>

// ── Level cards ───────────────────────────────────────────────────────────────────────────────

/*
 * LevelCard and LevelCardSkeleton share one grid so the skeleton has exactly the card's shape.
 * Phones: thumbnail | rank + name, with the stats on a full-width row below.
 * sm and up: the thumbnail spans both rows, stats sit under the name, an arrow on the right.
 */
export const LEVEL_CARD_GRID =
  'grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:gap-y-2.5 md:grid-cols-[13rem_minmax(0,1fr)_auto]'
export const LEVEL_CARD_THUMB =
  'col-start-1 row-start-1 w-full self-start sm:row-span-2 sm:self-center'
export const LEVEL_CARD_TITLE = 'col-start-2 row-start-1 min-w-0 sm:self-end'
export const LEVEL_CARD_STATS =
  'col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:self-start'
export const LEVEL_CARD_ARROW = 'hidden sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:block'
