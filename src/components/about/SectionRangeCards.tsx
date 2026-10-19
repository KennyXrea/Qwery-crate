import { Link } from 'react-router'
import { formatCount } from '../../lib/format'
import { LEVEL_SECTIONS } from '../../lib/points'
import type { LevelSection, PointsSettings } from '../../lib/points'
import { SECTION_LABELS } from '../level/level-visuals'
import { STRETCHED_LINK } from '../ui/card-link'
import { IconArrowRight } from '../ui/icons'
import { sectionRangeLabel, sectionSize } from './about-points'

const SECTION_DETAILS: Readonly<Record<LevelSection, string>> = {
  main: 'The top of the list. Worth the most points.',
  extended: 'The next stretch of levels. Still worth points.',
  legacy: 'Levels pushed off the end. Kept for history, worth 0 points.',
}

type SectionRangeCardsProps = {
  /** The current settings; null while they load (with `loading`) or when they failed. */
  settings: PointsSettings | null
  loading?: boolean
}

/**
 * The three list sections as small cards: name, the positions they cover right now
 * ("#1–25"), what they mean, and a link to that section of the list (the whole card).
 */
export function SectionRangeCards({ settings, loading = false }: SectionRangeCardsProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3" aria-busy={loading || undefined}>
      {LEVEL_SECTIONS.map((section) => {
        const range = settings ? sectionRangeLabel(section, settings) : null
        const size = settings ? sectionSize(section, settings) : null
        return (
          <li
            key={section}
            className="group relative flex flex-col rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-border-strong has-focus-visible:border-accent"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-text">
                <Link to={`/list?section=${section}`} className={STRETCHED_LINK}>
                  {SECTION_LABELS[section]}
                  <span className="sr-only"> list</span>
                </Link>
              </h3>
              <IconArrowRight className="size-4 text-muted transition-colors group-hover:text-accent" />
            </div>
            {loading ? (
              // Not <Skeleton>: its colour is this card's own background (surface-2).
              <span
                aria-hidden="true"
                className="mt-1 block h-5 w-28 animate-shimmer rounded-md bg-border"
              />
            ) : settings ? (
              <p className="mt-1 font-mono text-sm text-accent-soft tabular-nums">
                {range ?? 'Empty right now'}
                {size !== null && size > 0 ? (
                  <span className="font-sans text-xs text-muted">
                    {' · '}
                    {formatCount(size, 'spot')}
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted">{SECTION_DETAILS[section]}</p>
          </li>
        )
      })}
    </ul>
  )
}
