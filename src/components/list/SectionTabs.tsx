import { Link, useLocation } from 'react-router'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../lib/cn'
import { LEVEL_SECTIONS, pointsSettingsFromRow, sectionRange } from '../../lib/points'
import { SECTION_LABELS } from '../level/level-visuals'
import { Skeleton } from '../ui/Skeleton'
import { rangeLabel, rangeSpoken } from './list-options'
import { listSearch, updateListParams, type ListParams } from './list-params'

type SectionTabsProps = {
  params: ListParams
  className?: string
}

/**
 * Main / Extended / Legacy, each with the positions it covers (from the site settings, e.g.
 * "#1–25"). They are links (shareable, and they open in a new tab with a middle click) that
 * keep the other filters and go back to page 1; the current one has aria-current="page".
 */
export function SectionTabs({ params, className }: SectionTabsProps) {
  const { pathname } = useLocation()
  const { data: settingsRow, isPending } = useSettings()
  const settings = settingsRow ? pointsSettingsFromRow(settingsRow) : null

  return (
    <nav aria-label="List sections" className={className}>
      <ul className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1">
        {LEVEL_SECTIONS.map((section) => {
          const current = section === params.section
          const range = settings ? sectionRange(section, settings) : null
          const search = listSearch(updateListParams(params, { section }))

          return (
            <li key={section} className="min-w-0">
              <Link
                to={{ pathname, search }}
                preventScrollReset
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition-colors sm:flex-row sm:gap-2',
                  current
                    ? 'bg-surface-2 text-text shadow-sm shadow-black/30 ring-1 ring-accent/40 ring-inset'
                    : 'text-muted hover:bg-surface-2/60 hover:text-text',
                )}
              >
                <span className="text-sm font-semibold">{SECTION_LABELS[section]}</span>
                {range ? (
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      current ? 'text-accent-soft' : 'text-muted',
                    )}
                  >
                    <span aria-hidden="true">{rangeLabel(range)}</span>
                    <span className="sr-only">, {rangeSpoken(range)}</span>
                  </span>
                ) : isPending ? (
                  <Skeleton className="h-3 w-10" />
                ) : settings ? (
                  // The settings make this section empty (e.g. an Extended size of 0).
                  <span className="font-mono text-xs text-muted">
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">, no positions</span>
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
