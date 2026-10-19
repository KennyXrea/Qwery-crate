import { describe, expect, it } from 'vitest'
import {
  formatDecay,
  formatDecayPercent,
  lastPointsPosition,
  minimumFromPosition,
  pointsExamples,
  sectionRangeLabel,
  sectionSize,
} from '../components/about/about-points'
import { DEFAULT_POINTS_SETTINGS, formulaPoints } from '../lib/points'
import type { PointsSettings } from '../lib/points'

const settings = (overrides: Partial<PointsSettings> = {}): PointsSettings => ({
  ...DEFAULT_POINTS_SETTINGS,
  ...overrides,
})

describe('section ranges', () => {
  it('describes the default sections', () => {
    const s = settings()
    expect(sectionRangeLabel('main', s)).toBe('#1–25')
    expect(sectionRangeLabel('extended', s)).toBe('#26–50')
    expect(sectionRangeLabel('legacy', s)).toBe('#51 and below')
    expect(sectionSize('main', s)).toBe(25)
    expect(sectionSize('extended', s)).toBe(25)
    expect(sectionSize('legacy', s)).toBeNull()
  })

  it('handles one-spot and empty sections', () => {
    const s = settings({ mainListSize: 1, extendedListSize: 0 })
    expect(sectionRangeLabel('main', s)).toBe('#1')
    expect(sectionRangeLabel('extended', s)).toBeNull()
    expect(sectionRangeLabel('legacy', s)).toBe('#2 and below')
    expect(sectionSize('extended', s)).toBe(0)
  })

  it('uses thousands separators for big lists', () => {
    expect(sectionRangeLabel('extended', settings({ mainListSize: 1000 }))).toBe('#1,001–1,025')
  })
})

describe('lastPointsPosition and minimumFromPosition', () => {
  it('finds the end of Extended', () => {
    expect(lastPointsPosition(settings())).toBe(50)
    expect(lastPointsPosition(settings({ mainListSize: 3, extendedListSize: 2 }))).toBe(5)
  })

  it('is null when no level that earns points reaches the minimum', () => {
    // 250 × 0.95^49 ≈ 20.25 is still far above 5.
    expect(minimumFromPosition(settings())).toBeNull()
  })

  it('finds the first position worth the minimum', () => {
    const s = settings({ pointsMax: 100, pointsDecay: 0.9, pointsMin: 50, mainListSize: 10 })
    // 100 × 0.9^6 = 53.1 > 50, 100 × 0.9^7 = 47.8 ≤ 50 → #8.
    expect(minimumFromPosition(s)).toBe(8)
    expect(formulaPoints(7, s)).toBeGreaterThan(50)
    expect(formulaPoints(8, s)).toBe(50)
  })

  it('is #1 when the top is not above the minimum', () => {
    expect(minimumFromPosition(settings({ pointsMax: 5, pointsMin: 5 }))).toBe(1)
  })
})

describe('pointsExamples', () => {
  it('picks the top, round numbers, both ends of each section and the first Legacy spot', () => {
    const rows = pointsExamples(settings())
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 5, 10, 20, 25, 26, 50, 51])
    expect(rows[0]).toEqual({ position: 1, section: 'main', points: 250 })
    expect(rows.find((row) => row.position === 26)?.section).toBe('extended')
    expect(rows.find((row) => row.position === 50)?.points).toBe(20.25)
    expect(rows.at(-1)).toEqual({ position: 51, section: 'legacy', points: 0 })
  })

  it('computes every row with the shared points formula', () => {
    const s = settings({ pointsMax: 300, pointsDecay: 0.9, mainListSize: 10, extendedListSize: 5 })
    for (const row of pointsExamples(s)) {
      expect(row.points).toBe(formulaPoints(row.position, s))
    }
  })

  it('stops at the first Legacy spot for short lists', () => {
    const rows = pointsExamples(settings({ mainListSize: 3, extendedListSize: 2 }))
    expect(rows.map((row) => [row.position, row.section])).toEqual([
      [1, 'main'],
      [2, 'main'],
      [3, 'main'],
      [4, 'extended'],
      [5, 'extended'],
      [6, 'legacy'],
    ])
  })

  it('includes where the minimum starts', () => {
    const s = settings({ pointsMax: 100, pointsDecay: 0.9, pointsMin: 50, mainListSize: 10 })
    expect(pointsExamples(s).map((row) => row.position)).toContain(8)
  })
})

describe('decay formatting', () => {
  it('shows the decay as typed and as a share', () => {
    expect(formatDecay(0.95)).toBe('0.95')
    expect(formatDecay(0.955)).toBe('0.955')
    expect(formatDecay(1)).toBe('1')
    expect(formatDecayPercent(0.95)).toBe('95%')
    expect(formatDecayPercent(0.955)).toBe('95.5%')
  })
})
