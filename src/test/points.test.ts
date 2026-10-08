import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POINTS_SETTINGS,
  LEVEL_SECTIONS,
  formulaPoints,
  isLevelSection,
  levelPoints,
  levelSection,
  parseNumeric,
  pointsSettingsFromRow,
  roundNumeric,
  sectionRange,
} from '../lib/points'
import type { PointsSettings } from '../lib/points'

const defaults = DEFAULT_POINTS_SETTINGS

function withSettings(overrides: Partial<PointsSettings>): PointsSettings {
  return { ...DEFAULT_POINTS_SETTINGS, ...overrides }
}

/**
 * Exact reference for max × decay^(position − 1), rounded half away from zero to 2 decimals,
 * done with whole numbers (BigInt) like Postgres numeric. decayHundredths = decay × 100.
 */
function exactPoints(max: number, decayHundredths: number, position: number): number {
  const exponent = BigInt(position - 1)
  const numerator = BigInt(max) * BigInt(decayHundredths) ** exponent * 100n
  const denominator = 100n ** exponent
  const cents = (2n * numerator + denominator) / (2n * denominator)
  return Number(cents) / 100
}

const INVALID_POSITIONS = [
  null,
  undefined,
  0,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
] as const

describe('DEFAULT_POINTS_SETTINGS', () => {
  it('matches the database defaults', () => {
    expect(defaults).toEqual({
      mainListSize: 25,
      extendedListSize: 25,
      pointsMax: 250,
      pointsDecay: 0.95,
      pointsMin: 5,
    })
  })

  it('cannot be changed by accident', () => {
    expect(Object.isFrozen(defaults)).toBe(true)
  })
})

describe('formulaPoints — default settings', () => {
  it.each([
    [1, 250],
    [2, 237.5],
    [3, 225.63],
    [5, 203.63],
    [10, 157.56],
    [20, 94.34],
    [25, 73],
    [26, 69.35],
    [49, 21.31],
    [50, 20.25],
  ])('#%i = %d', (position, expected) => {
    expect(formulaPoints(position, defaults)).toBe(expected)
  })

  it('gives #25 exactly 73 (72.997… rounds up)', () => {
    expect(formulaPoints(25, defaults)).toBe(73)
  })

  it('gives #50 = 20.25, not 20.27', () => {
    expect(formulaPoints(50, defaults)).toBe(20.25)
    expect(formulaPoints(50, defaults)).not.toBe(20.27)
  })

  it('gives legacy positions 0', () => {
    expect(formulaPoints(51, defaults)).toBe(0)
    expect(formulaPoints(500, defaults)).toBe(0)
  })

  it('never has more than 2 decimals', () => {
    for (let position = 1; position <= 60; position++) {
      const points = formulaPoints(position, defaults) ?? Number.NaN
      expect(Number((points * 100).toFixed(6)) % 1).toBe(0)
    }
  })

  it('goes down (or stays level) as the position goes down the list', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let position = 1; position <= 60; position++) {
      const points = formulaPoints(position, defaults) ?? Number.NaN
      expect(points).toBeLessThanOrEqual(previous)
      previous = points
    }
  })
})

describe('formulaPoints — floor (pointsMin)', () => {
  it('lifts points that fall below the floor', () => {
    const settings = withSettings({ pointsMin: 100 })
    expect(formulaPoints(20, settings)).toBe(100) // the formula alone gives 94.34
    expect(formulaPoints(10, settings)).toBe(157.56) // above the floor: unchanged
  })

  it('uses the default floor of 5 deep in a long list', () => {
    const settings = withSettings({ extendedListSize: 100 })
    expect(formulaPoints(80, settings)).toBe(5) // the formula alone gives 4.35
  })

  it('rounds the floor too, like round(greatest(…), 2) in SQL', () => {
    expect(formulaPoints(80, withSettings({ extendedListSize: 100, pointsMin: 5.005 }))).toBe(5.01)
  })

  it('does not apply to legacy levels', () => {
    expect(formulaPoints(51, withSettings({ pointsMin: 100 }))).toBe(0)
  })
})

describe('formulaPoints — custom settings', () => {
  it('pointsMax 200: #4 = 171.48 (exactly 171.475, rounded half away from zero)', () => {
    expect(formulaPoints(4, withSettings({ pointsMax: 200 }))).toBe(171.48)
    // Why roundNumeric exists: plain float rounding gets this one wrong.
    expect(Math.round(200 * 0.95 ** 3 * 100) / 100).toBe(171.47)
  })

  it('pointsDecay 0.85: #3 = 180.63 (exactly 180.625)', () => {
    expect(formulaPoints(3, withSettings({ pointsDecay: 0.85 }))).toBe(180.63)
  })

  it('pointsDecay 1: every ranked level is worth pointsMax', () => {
    const settings = withSettings({ pointsDecay: 1 })
    expect(formulaPoints(1, settings)).toBe(250)
    expect(formulaPoints(50, settings)).toBe(250)
    expect(formulaPoints(51, settings)).toBe(0)
  })

  it('matches exact decimal arithmetic for many settings and positions', () => {
    const mismatches: string[] = []
    for (const max of [1, 7, 100, 150, 199, 200, 250, 333, 500, 1000]) {
      for (let decayHundredths = 80; decayHundredths <= 100; decayHundredths++) {
        const settings: PointsSettings = {
          mainListSize: 60,
          extendedListSize: 0,
          pointsMax: max,
          pointsDecay: decayHundredths / 100,
          pointsMin: 0,
        }
        for (let position = 1; position <= 60; position++) {
          const expected = exactPoints(max, decayHundredths, position)
          const actual = formulaPoints(position, settings)
          if (actual !== expected) {
            mismatches.push(`max ${max}, decay 0.${decayHundredths}, #${position}: ${actual}`)
          }
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('levelPoints', () => {
  it('uses the formula when there is no override', () => {
    expect(levelPoints(5, null, defaults)).toBe(203.63)
    expect(levelPoints(5, undefined, defaults)).toBe(203.63)
    expect(levelPoints(30, null, defaults)).toBe(formulaPoints(30, defaults))
  })

  it('lets the override win in Main and Extended', () => {
    expect(levelPoints(1, 300, defaults)).toBe(300)
    expect(levelPoints(30, 12.5, defaults)).toBe(12.5)
  })

  it('uses the override exactly as stored (like the SQL, it is not rounded)', () => {
    expect(levelPoints(10, 12.345, defaults)).toBe(12.345)
  })

  it('treats an override of 0 as an override', () => {
    expect(levelPoints(1, 0, defaults)).toBe(0)
  })

  it('gives legacy levels 0, even with an override', () => {
    expect(levelPoints(51, 100, defaults)).toBe(0)
    expect(levelPoints(51, null, defaults)).toBe(0)
  })

  it('ignores an override that is not a real number', () => {
    expect(levelPoints(5, Number.NaN, defaults)).toBe(203.63)
    expect(levelPoints(5, Number.POSITIVE_INFINITY, defaults)).toBe(203.63)
  })
})

describe('levelSection', () => {
  it('uses the default sizes: #1–25 main, #26–50 extended, #51+ legacy', () => {
    expect(levelSection(1, defaults)).toBe('main')
    expect(levelSection(25, defaults)).toBe('main')
    expect(levelSection(26, defaults)).toBe('extended')
    expect(levelSection(50, defaults)).toBe('extended')
    expect(levelSection(51, defaults)).toBe('legacy')
    expect(levelSection(10_000, defaults)).toBe('legacy')
  })

  it('follows the settings (main 5, extended 3)', () => {
    const settings = withSettings({ mainListSize: 5, extendedListSize: 3 })
    expect(levelSection(5, settings)).toBe('main')
    expect(levelSection(6, settings)).toBe('extended')
    expect(levelSection(8, settings)).toBe('extended')
    expect(levelSection(9, settings)).toBe('legacy')
    expect(formulaPoints(8, settings)).toBe(174.58) // 250 × 0.95^7 = 174.5843…
    expect(formulaPoints(9, settings)).toBe(0)
  })

  it('has no Extended section when its size is 0', () => {
    const settings = withSettings({ mainListSize: 5, extendedListSize: 0 })
    expect(levelSection(5, settings)).toBe('main')
    expect(levelSection(6, settings)).toBe('legacy')
    expect(levelPoints(6, 50, settings)).toBe(0)
  })
})

describe('invalid positions (like SQL: null)', () => {
  it.each(INVALID_POSITIONS)('%s → null', (position) => {
    expect(levelSection(position, defaults)).toBeNull()
    expect(formulaPoints(position, defaults)).toBeNull()
    expect(levelPoints(position, 100, defaults)).toBeNull()
  })
})

describe('sectionRange', () => {
  it('gives the default ranges', () => {
    expect(sectionRange('main', defaults)).toEqual({ start: 1, end: 25 })
    expect(sectionRange('extended', defaults)).toEqual({ start: 26, end: 50 })
    expect(sectionRange('legacy', defaults)).toEqual({ start: 51, end: null })
  })

  it('follows the settings', () => {
    const settings = withSettings({ mainListSize: 5, extendedListSize: 3 })
    expect(sectionRange('main', settings)).toEqual({ start: 1, end: 5 })
    expect(sectionRange('extended', settings)).toEqual({ start: 6, end: 8 })
    expect(sectionRange('legacy', settings)).toEqual({ start: 9, end: null })
  })

  it('returns null for an empty Extended section', () => {
    const settings = withSettings({ mainListSize: 5, extendedListSize: 0 })
    expect(sectionRange('extended', settings)).toBeNull()
    expect(sectionRange('legacy', settings)).toEqual({ start: 6, end: null })
  })

  it('agrees with levelSection at every boundary', () => {
    const settings = withSettings({ mainListSize: 7, extendedListSize: 4 })
    for (const section of LEVEL_SECTIONS) {
      const range = sectionRange(section, settings)
      if (!range) continue
      expect(levelSection(range.start, settings)).toBe(section)
      if (range.end !== null) expect(levelSection(range.end, settings)).toBe(section)
    }
  })
})

describe('isLevelSection', () => {
  it('accepts only the three section names', () => {
    expect(isLevelSection('main')).toBe(true)
    expect(isLevelSection('extended')).toBe(true)
    expect(isLevelSection('legacy')).toBe(true)
    expect(isLevelSection('Main')).toBe(false)
    expect(isLevelSection('')).toBe(false)
    expect(isLevelSection(null)).toBe(false)
    expect(isLevelSection(1)).toBe(false)
  })
})

describe('pointsSettingsFromRow', () => {
  it('reads numeric columns sent as numbers', () => {
    expect(
      pointsSettingsFromRow({
        main_list_size: 10,
        extended_list_size: 5,
        points_max: 200,
        points_decay: 0.9,
        points_min: 2,
      }),
    ).toEqual({
      mainListSize: 10,
      extendedListSize: 5,
      pointsMax: 200,
      pointsDecay: 0.9,
      pointsMin: 2,
    })
  })

  it('reads numeric columns sent as strings', () => {
    const settings = pointsSettingsFromRow({
      main_list_size: '25',
      extended_list_size: '25',
      points_max: '200',
      points_decay: '0.95',
      points_min: ' 5.5 ',
    })
    expect(settings).toEqual({
      mainListSize: 25,
      extendedListSize: 25,
      pointsMax: 200,
      pointsDecay: 0.95,
      pointsMin: 5.5,
    })
    expect(formulaPoints(4, settings)).toBe(171.48)
  })

  it('accepts a full site_settings row (extra columns are ignored)', () => {
    const row = {
      id: 1,
      site_name: 'Qwerty Crate',
      main_list_size: 30,
      extended_list_size: 0,
      points_max: 250,
      points_decay: 0.95,
      points_min: 5,
      updated_at: '2026-10-07T14:02:00.123456+00:00',
    }
    expect(pointsSettingsFromRow(row)).toEqual(
      withSettings({ mainListSize: 30, extendedListSize: 0 }),
    )
  })

  it('keeps a real 0 (an empty Extended section, no floor)', () => {
    const settings = pointsSettingsFromRow({ extended_list_size: 0, points_min: '0' })
    expect(settings.extendedListSize).toBe(0)
    expect(settings.pointsMin).toBe(0)
  })

  it('falls back to the defaults for a missing row', () => {
    expect(pointsSettingsFromRow(null)).toEqual(defaults)
    expect(pointsSettingsFromRow(undefined)).toEqual(defaults)
    expect(pointsSettingsFromRow({})).toEqual(defaults)
  })

  it('falls back per column for null or unreadable values', () => {
    expect(
      pointsSettingsFromRow({
        main_list_size: null,
        extended_list_size: '',
        points_max: 'abc',
        points_decay: '  ',
        points_min: Number.NaN,
      }),
    ).toEqual(defaults)
    expect(pointsSettingsFromRow({ points_max: '300', points_decay: null })).toEqual(
      withSettings({ pointsMax: 300 }),
    )
  })

  it('returns a fresh object (not the frozen defaults)', () => {
    const settings = pointsSettingsFromRow(null)
    expect(settings).not.toBe(defaults)
    expect(Object.isFrozen(settings)).toBe(false)
  })
})

describe('parseNumeric', () => {
  it('reads numbers and numeric strings', () => {
    expect(parseNumeric(12.5)).toBe(12.5)
    expect(parseNumeric(0)).toBe(0)
    expect(parseNumeric('12.50')).toBe(12.5)
    expect(parseNumeric(' 7 ')).toBe(7)
    expect(parseNumeric('-3')).toBe(-3)
  })

  it('returns null for anything else', () => {
    expect(parseNumeric(null)).toBeNull()
    expect(parseNumeric(undefined)).toBeNull()
    expect(parseNumeric('')).toBeNull()
    expect(parseNumeric('   ')).toBeNull()
    expect(parseNumeric('12 points')).toBeNull()
    expect(parseNumeric(Number.NaN)).toBeNull()
    expect(parseNumeric(Number.POSITIVE_INFINITY)).toBeNull()
    expect(parseNumeric('Infinity')).toBeNull()
    expect(parseNumeric(true)).toBeNull()
  })

  it('reads only plain decimals like Postgres sends, not JavaScript hex / binary / octal', () => {
    // Number() alone would turn these into 16, 3 and 7.
    expect(parseNumeric('0x10')).toBeNull()
    expect(parseNumeric('0b11')).toBeNull()
    expect(parseNumeric('0o7')).toBeNull()
    expect(parseNumeric('.5')).toBe(0.5)
    expect(parseNumeric('+2.50')).toBe(2.5)
    expect(parseNumeric('1e3')).toBe(1000)
    expect(pointsSettingsFromRow({ main_list_size: '0x10' }).mainListSize).toBe(25)
  })
})

describe('roundNumeric (Postgres round(numeric, n))', () => {
  it('rounds exact halves away from zero despite float error', () => {
    expect(roundNumeric(0.125)).toBe(0.13)
    expect(roundNumeric(1.005)).toBe(1.01) // the float is 1.00499999999999989…
    expect(roundNumeric(2.675)).toBe(2.68)
    expect(roundNumeric(171.47499999999997)).toBe(171.48)
    expect(roundNumeric(-1.005)).toBe(-1.01)
    expect(roundNumeric(-2.5, 0)).toBe(-3)
    expect(roundNumeric(2.5, 0)).toBe(3)
  })

  it('rounds everything else to the nearest value', () => {
    expect(roundNumeric(1.234)).toBe(1.23)
    expect(roundNumeric(1.236)).toBe(1.24)
    expect(roundNumeric(72.99725608469309)).toBe(73)
    expect(roundNumeric(20.248677704398197)).toBe(20.25)
  })

  it('supports other numbers of decimals', () => {
    expect(roundNumeric(7.25, 1)).toBe(7.3)
    expect(roundNumeric(7.35, 1)).toBe(7.4)
    expect(roundNumeric(7.34, 1)).toBe(7.3)
    expect(roundNumeric(1234.5678, 3)).toBe(1234.568)
  })

  it('never returns -0', () => {
    expect(Object.is(roundNumeric(-0.001), 0)).toBe(true)
    expect(Object.is(roundNumeric(-0), 0)).toBe(true)
  })

  it('handles very large values and non-numbers without damage', () => {
    expect(roundNumeric(12_345_678_901.234)).toBe(12_345_678_901.23)
    expect(roundNumeric(Number.NaN)).toBeNaN()
    expect(roundNumeric(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })

  it('leaves values too big to have decimals unchanged', () => {
    // Scaling up by 100 and back down would change them: 1e21 → 999999999999999900000.
    expect(roundNumeric(1e21)).toBe(1e21)
    expect(roundNumeric(-1e21)).toBe(-1e21)
    // 1e308 × 100 overflows to Infinity.
    expect(roundNumeric(1e308)).toBe(1e308)
    expect(roundNumeric(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE)
    expect(formulaPoints(1, withSettings({ pointsMax: 1e308 }))).toBe(1e308)
  })
})
