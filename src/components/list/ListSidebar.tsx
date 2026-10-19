import { Link } from 'react-router'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'
import { LEVEL_SECTIONS, pointsSettingsFromRow, roundNumeric, sectionRange } from '../../lib/points'
import { SECTION_LABELS } from '../level/level-visuals'
import { SidebarSection } from '../layout/Sidebar'
import { LatestRecordsBox } from '../shared/LatestRecordsBox'
import { RecentChangesBox } from '../shared/RecentChangesBox'
import { TopPlayersBox } from '../shared/TopPlayersBox'
import { IconArrowRight } from '../ui/icons'
import { TEXT_LINK } from '../ui/link-styles'
import { SkeletonText } from '../ui/Skeleton'
import { rangeLabel, rangeSpoken, SECTION_BLURBS } from './list-options'

/**
 * The list page's sidebar cards: what the list is, how points work (with the current
 * settings), the top 5 players, the latest 5 records and the latest 5 changes.
 * Render it inside a Sidebar (PageShell's `sidebar` does that).
 */
export function ListSidebar() {
  const { data: row, isPending } = useSettings()
  const settings = row ? pointsSettingsFromRow(row) : null

  return (
    <>
      <SidebarSection title="About the list">
        <p>
          Our friend group's hardest Geometry Dash levels. We agree on the order together, hardest
          first, and every completion shows on the level's page.
        </p>
        {isPending ? (
          <SkeletonText lines={3} className="mt-3" />
        ) : (
          <ul className="mt-3 space-y-1.5">
            {LEVEL_SECTIONS.map((section) => {
              const range = settings ? sectionRange(section, settings) : null
              return (
                <li key={section}>
                  <span className="font-semibold text-text">{SECTION_LABELS[section]}</span>
                  {range ? (
                    <span className="font-mono text-xs text-accent-soft">
                      {' '}
                      <span aria-hidden="true">{rangeLabel(range)}</span>
                      <span className="sr-only">({rangeSpoken(range)})</span>
                    </span>
                  ) : null}
                  : {SECTION_BLURBS[section]}
                </li>
              )
            })}
          </ul>
        )}
      </SidebarSection>

      <SidebarSection title="How points work">
        {isPending ? (
          <SkeletonText lines={3} />
        ) : settings ? (
          <p>
            #1 is worth{' '}
            <span className="font-mono text-text">{formatNumber(settings.pointsMax)}</span> points
            {settings.pointsDecay < 1 ? (
              <>
                , and each place below it is worth{' '}
                <span className="font-mono text-text">
                  {formatNumber(roundNumeric((1 - settings.pointsDecay) * 100, 2))}%
                </span>{' '}
                less (never under{' '}
                <span className="font-mono text-text">{formatNumber(settings.pointsMin)}</span>)
              </>
            ) : null}
            . Legacy levels are worth nothing. A player's score is the total of every level they
            have beaten.
          </p>
        ) : (
          <p>
            Higher places are worth more points, and Legacy levels are worth nothing. A player's
            score is the total of every level they have beaten.
          </p>
        )}
        <Link to="/about" className={cn(TEXT_LINK, 'mt-2')}>
          Read how points work
          <IconArrowRight />
        </Link>
      </SidebarSection>

      <TopPlayersBox />
      <LatestRecordsBox />
      <RecentChangesBox />
    </>
  )
}
