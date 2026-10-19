import type { ReactNode } from 'react'
import { formatNumber, formatPoints } from '../../lib/format'
import { formulaPoints } from '../../lib/points'
import type { PointsSettings } from '../../lib/points'
import { SectionBadge } from '../level/SectionBadge'
import { StatGrid } from '../shared/StatGrid'
import { StatGridSkeleton } from '../shared/StatGridSkeleton'
import { StatTile } from '../shared/StatTile'
import { RankNumber } from '../ui/RankNumber'
import { Skeleton } from '../ui/Skeleton'
import {
  formatDecay,
  formatDecayPercent,
  lastPointsPosition,
  minimumFromPosition,
  pointsExamples,
} from './about-points'

type PointsFormulaProps = {
  /** The current settings (usePointsSettings / pointsSettingsFromRow). */
  settings: PointsSettings
}

/**
 * A piece of the formula that moves to the next line as a whole on narrow screens (it only
 * wraps inside itself when it is wider than a whole line).
 */
function Chunk({ children }: { children: ReactNode }) {
  return <span className="inline-block max-w-full">{children}</span>
}

/** "decay^(position − 1)", read out as "to the power of". */
function Power({ children }: { children: ReactNode }) {
  return (
    <sup className="ml-px">
      <span className="sr-only"> to the power of </span>
      {children}
    </sup>
  )
}

/**
 * The points formula with the current settings filled in: the formula in words and numbers,
 * the four settings as tiles, where the minimum starts, and a table of example positions
 * computed with src/lib/points.ts (the same formula the database uses).
 */
export function PointsFormula({ settings }: PointsFormulaProps) {
  const last = lastPointsPosition(settings)
  const minimumFrom = minimumFromPosition(settings)
  const lastPoints = last >= 1 ? formulaPoints(last, settings) : null
  const examples = pointsExamples(settings)
  const max = formatNumber(settings.pointsMax)
  const min = formatNumber(settings.pointsMin)
  const decay = formatDecay(settings.pointsDecay)

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-bg/60 px-4 py-3 font-mono text-sm break-words">
        <p className="text-muted">
          <Chunk>points =</Chunk> <Chunk>max(minimum,</Chunk>{' '}
          <Chunk>
            top × decay<Power>position − 1</Power>)
          </Chunk>
        </p>
        <div>
          <p className="font-sans text-[0.6875rem] font-medium tracking-widest text-accent uppercase">
            With the current settings
          </p>
          <p className="mt-1 text-text">
            <Chunk>points =</Chunk> <Chunk>max({min},</Chunk>{' '}
            <Chunk>
              {max} × {decay}
              <Power>position − 1</Power>)
            </Chunk>
          </p>
        </div>
      </div>

      <StatGrid columns={4} label="Points settings">
        <StatTile label="Top (#1)" value={formatPoints(settings.pointsMax)} hint="Points for #1" />
        <StatTile
          label="Decay"
          value={`× ${decay}`}
          hint={`Each place keeps ${formatDecayPercent(settings.pointsDecay)}`}
        />
        <StatTile
          label="Minimum"
          value={formatPoints(settings.pointsMin)}
          hint="Lowest for Main and Extended"
        />
        <StatTile
          label="Earn points"
          value={last >= 1 ? `#1–${formatNumber(last)}` : 'None'}
          hint="Main and Extended"
        />
      </StatGrid>

      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-accent">
        {lastPoints !== null ? (
          <li>
            The last spot that earns points,{' '}
            <span className="text-text">#{formatNumber(last)}</span>, is worth{' '}
            <span className="font-mono text-text">{formatPoints(lastPoints)}</span> points.
          </li>
        ) : null}
        {minimumFrom === null ? (
          <li>
            No level that earns points gets down to the minimum of{' '}
            <span className="font-mono text-text">{formatPoints(settings.pointsMin)}</span> with
            these settings.
          </li>
        ) : minimumFrom === last ? (
          <li>
            <span className="text-text">#{formatNumber(last)}</span> is worth the minimum,{' '}
            <span className="font-mono text-text">{formatPoints(settings.pointsMin)}</span> points.
          </li>
        ) : (
          <li>
            From <span className="text-text">#{formatNumber(minimumFrom)}</span> to #
            {formatNumber(last)} the formula would drop below the minimum, so those levels are worth{' '}
            <span className="font-mono text-text">{formatPoints(settings.pointsMin)}</span> points
            each.
          </li>
        )}
        <li>
          Levels in Legacy, from <span className="text-text">#{formatNumber(last + 1)}</span> on,
          are always worth <span className="font-mono text-text">0</span> points.
        </li>
        <li>Points are rounded to 2 decimal places.</li>
      </ul>

      {examples.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="border-b border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">
              Points per position with the current settings
            </caption>
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2 font-medium">
                  Position
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Section
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {examples.map((row) => (
                <tr key={row.position}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <RankNumber rank={row.position} size="sm" />
                  </th>
                  <td className="px-3 py-2">
                    <SectionBadge section={row.section} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text tabular-nums">
                    {formatPoints(row.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** A loading placeholder shaped like PointsFormula. */
export function PointsFormulaSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-bg/60 px-4 py-3">
        <Skeleton className="h-4 w-4/5 max-w-80" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-4 w-3/5 max-w-64" />
      </div>
      <StatGridSkeleton count={4} columns={4} />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/5" />
      </div>
      <div className="space-y-2 rounded-xl border border-border p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1">
            <Skeleton className="h-4 w-8" />
            <Skeleton rounded="full" className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
