import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DIFFICULTIES,
  EMPTY_VALUE,
  difficultyLabel,
  formatAverage,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPoints,
  isDemon,
  isDifficulty,
} from '../lib/format'
import type { GdDifficulty } from '../lib/format'

// Newer ICU versions put a narrow no-break space before AM/PM; compare with plain spaces.
function plain(text: string): string {
  return text.replace(/\s/g, ' ')
}

// Time zones on both sides of UTC, including the extremes (UTC−11 and UTC+14).
const TIME_ZONES = [
  'America/Los_Angeles',
  'America/Santo_Domingo',
  'Pacific/Pago_Pago',
  'Pacific/Kiritimati',
  'Asia/Tokyo',
  'Europe/London',
  'UTC',
]

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('formatDate — date-only strings', () => {
  it('shows the calendar day', () => {
    expect(formatDate('2026-01-05')).toBe('Jan 5, 2026')
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026')
    expect(formatDate('2028-02-29')).toBe('Feb 29, 2028')
    expect(formatDate(' 2026-07-04 ')).toBe('Jul 4, 2026')
  })

  it('rejects impossible or malformed dates', () => {
    expect(formatDate('2026-02-30')).toBe(EMPTY_VALUE)
    expect(formatDate('2027-02-29')).toBe(EMPTY_VALUE)
    expect(formatDate('2026-13-01')).toBe(EMPTY_VALUE)
    expect(formatDate('2026-00-10')).toBe(EMPTY_VALUE)
    expect(formatDate('2026-1-5')).toBe(EMPTY_VALUE)
    expect(formatDate('0000-01-05')).toBe(EMPTY_VALUE) // Postgres has no year 0
    expect(formatDate('01/05/2026')).toBe(EMPTY_VALUE)
    expect(formatDate('not a date')).toBe(EMPTY_VALUE)
    expect(formatDate('')).toBe(EMPTY_VALUE)
  })

  it('shows a dash for missing values', () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE)
    expect(formatDate(undefined)).toBe(EMPTY_VALUE)
  })

  it('shows years 1–99 as they are (valid in Postgres, e.g. a typo for 2026)', () => {
    // Date.UTC would turn year 26 into 1926.
    expect(formatDate('0026-01-05')).toBe('Jan 5, 26')
    expect(formatDate('0001-01-01')).toBe('Jan 1, 1')
    expect(formatDate('0026-01-05T15:04:00Z', { timeZone: 'UTC' })).toBe('Jan 5, 26')
    expect(plain(formatDateTime('0026-01-05T15:04:00Z', { timeZone: 'UTC' }))).toBe(
      'Jan 5, 26, 3:04 PM',
    )
  })

  it('ignores options.timeZone (a calendar day has no time zone)', () => {
    expect(formatDate('2026-01-05', { timeZone: 'Pacific/Pago_Pago' })).toBe('Jan 5, 2026')
    expect(formatDate('2026-01-05', { timeZone: 'Pacific/Kiritimati' })).toBe('Jan 5, 2026')
  })
})

describe.each(TIME_ZONES)('formatDate keeps the day when the computer is in %s', (zone) => {
  it('shows the same calendar day', () => {
    vi.stubEnv('TZ', zone)
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone)
    expect(formatDate('2026-01-05')).toBe('Jan 5, 2026')
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026')
    expect(formatDate('2026-03-08')).toBe('Mar 8, 2026') // US clocks change that night
    expect(formatDate('2026-03-29')).toBe('Mar 29, 2026') // EU clocks change that night
    expect(formatDate('2026-11-01')).toBe('Nov 1, 2026')
    expect(formatDateTime('2026-01-05')).toBe('Jan 5, 2026')
  })
})

describe('the time zone stub really changes the local zone', () => {
  it('makes the naive new Date(dateString) show the wrong day west of UTC', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    // This is the bug formatDate avoids: "2026-01-05" is midnight UTC = Jan 4 in California.
    expect(new Date('2026-01-05').getDate()).toBe(4)
    expect(formatDate('2026-01-05')).toBe('Jan 5, 2026')
  })
})

describe('formatDate — timestamps', () => {
  it('shows the day in the given time zone', () => {
    const late = '2026-01-05T02:30:00Z'
    expect(formatDate(late, { timeZone: 'UTC' })).toBe('Jan 5, 2026')
    expect(formatDate(late, { timeZone: 'America/New_York' })).toBe('Jan 4, 2026')
    expect(formatDate(late, { timeZone: 'Asia/Tokyo' })).toBe('Jan 5, 2026')
  })

  it("uses the viewer's time zone by default", () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(formatDate('2026-01-05T02:30:00Z')).toBe('Jan 4, 2026')
    vi.stubEnv('TZ', 'Asia/Tokyo')
    expect(formatDate('2026-01-05T20:30:00Z')).toBe('Jan 6, 2026')
  })

  it('reads the formats Postgres and PostgREST send', () => {
    const utc = { timeZone: 'UTC' }
    expect(formatDate('2026-10-07T14:02:00.123456+00:00', utc)).toBe('Oct 7, 2026')
    expect(formatDate('2026-10-07 23:30:00+00', utc)).toBe('Oct 7, 2026')
    expect(formatDate('2026-10-07T23:30:00-0500', utc)).toBe('Oct 8, 2026')
  })

  it('accepts a Date', () => {
    expect(formatDate(new Date(Date.UTC(2026, 0, 5, 12)), { timeZone: 'UTC' })).toBe('Jan 5, 2026')
    expect(formatDate(new Date(Number.NaN))).toBe(EMPTY_VALUE)
  })

  it('rejects impossible timestamps', () => {
    expect(formatDate('2026-02-30T10:00:00Z')).toBe(EMPTY_VALUE)
    expect(formatDate('2026-01-05T25:00:00Z')).toBe(EMPTY_VALUE)
  })

  it("falls back to the viewer's time zone for an unknown zone instead of throwing", () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(formatDate('2026-01-05T02:30:00Z', { timeZone: 'Not/A_Zone' })).toBe('Jan 4, 2026')
    expect(formatDate('2026-01-05T02:30:00Z', { timeZone: '' })).toBe('Jan 4, 2026')
  })
})

describe('formatDateTime', () => {
  const instant = '2026-01-05T20:04:00Z'

  it('shows date and time in the given time zone', () => {
    expect(plain(formatDateTime(instant, { timeZone: 'UTC' }))).toBe('Jan 5, 2026, 8:04 PM')
    expect(plain(formatDateTime(instant, { timeZone: 'America/New_York' }))).toBe(
      'Jan 5, 2026, 3:04 PM',
    )
    expect(plain(formatDateTime(instant, { timeZone: 'Asia/Tokyo' }))).toBe('Jan 6, 2026, 5:04 AM')
  })

  it("uses the viewer's time zone by default", () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    expect(plain(formatDateTime(instant))).toBe('Jan 5, 2026, 12:04 PM')
  })

  it('reads timestamptz strings from Supabase', () => {
    const utc = { timeZone: 'UTC' }
    expect(plain(formatDateTime('2026-10-07T14:02:59.999999+00:00', utc))).toBe(
      'Oct 7, 2026, 2:02 PM',
    )
    expect(plain(formatDateTime('2026-10-07 14:02:00+00', utc))).toBe('Oct 7, 2026, 2:02 PM')
    expect(plain(formatDateTime('2026-10-07T19:32:00+05:30', utc))).toBe('Oct 7, 2026, 2:02 PM')
    expect(plain(formatDateTime('2026-10-07T14:02:00z', utc))).toBe('Oct 7, 2026, 2:02 PM')
  })

  it('treats a timestamp without an offset as local time', () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    expect(plain(formatDateTime('2026-10-07T09:15:00'))).toBe('Oct 7, 2026, 9:15 AM')
  })

  it('accepts a Date', () => {
    const date = new Date(Date.UTC(2026, 0, 5, 0, 0))
    expect(plain(formatDateTime(date, { timeZone: 'UTC' }))).toBe('Jan 5, 2026, 12:00 AM')
  })

  it('shows only the day for a date-only value', () => {
    expect(formatDateTime('2026-01-05')).toBe('Jan 5, 2026')
  })

  it("falls back to the viewer's time zone for an unknown zone instead of throwing", () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    expect(plain(formatDateTime(instant, { timeZone: 'Mars/Olympus_Mons' }))).toBe(
      'Jan 5, 2026, 12:04 PM',
    )
  })

  it('shows a dash for missing or unreadable values', () => {
    expect(formatDateTime(null)).toBe(EMPTY_VALUE)
    expect(formatDateTime(undefined)).toBe(EMPTY_VALUE)
    expect(formatDateTime('')).toBe(EMPTY_VALUE)
    expect(formatDateTime('yesterday')).toBe(EMPTY_VALUE)
    expect(formatDateTime('2026-02-30T10:00:00Z')).toBe(EMPTY_VALUE)
    expect(formatDateTime(new Date(Number.NaN))).toBe(EMPTY_VALUE)
  })
})

describe('formatPoints', () => {
  it('always shows 2 decimals', () => {
    expect(formatPoints(250)).toBe('250.00')
    expect(formatPoints(73)).toBe('73.00')
    expect(formatPoints(20.25)).toBe('20.25')
    expect(formatPoints(237.5)).toBe('237.50')
    expect(formatPoints(0)).toBe('0.00')
  })

  it('adds thousands separators', () => {
    expect(formatPoints(1234.5)).toBe('1,234.50')
    expect(formatPoints(1_234_567.891)).toBe('1,234,567.89')
  })

  it('keeps the digits of huge values', () => {
    expect(formatPoints(1e21)).toBe('1,000,000,000,000,000,000,000.00')
    expect(formatNumber(1e21)).toBe('1,000,000,000,000,000,000,000')
  })

  it('rounds like Postgres (exact halves away from zero)', () => {
    expect(formatPoints(171.47499999999997)).toBe('171.48')
    expect(formatPoints(1.005)).toBe('1.01')
  })

  it('reads numeric strings', () => {
    expect(formatPoints('203.63')).toBe('203.63')
    expect(formatPoints('250')).toBe('250.00')
  })

  it('never shows -0.00', () => {
    expect(formatPoints(-0)).toBe('0.00')
    expect(formatPoints(-0.001)).toBe('0.00')
  })

  it('shows a dash for missing or unreadable values', () => {
    expect(formatPoints(null)).toBe(EMPTY_VALUE)
    expect(formatPoints(undefined)).toBe(EMPTY_VALUE)
    expect(formatPoints('')).toBe(EMPTY_VALUE)
    expect(formatPoints('abc')).toBe(EMPTY_VALUE)
    expect(formatPoints('0x10')).toBe(EMPTY_VALUE)
    expect(formatPoints(Number.NaN)).toBe(EMPTY_VALUE)
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(61234)).toBe('61,234')
    expect(formatNumber(1_234_567)).toBe('1,234,567')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(-4200)).toBe('-4,200')
  })

  it('keeps up to 2 decimals when there are any', () => {
    expect(formatNumber(12.5)).toBe('12.5')
    expect(formatNumber(1234.567)).toBe('1,234.57')
  })

  it('reads numeric strings', () => {
    expect(formatNumber('61234')).toBe('61,234')
  })

  it('shows a dash for missing or unreadable values', () => {
    expect(formatNumber(null)).toBe(EMPTY_VALUE)
    expect(formatNumber(undefined)).toBe(EMPTY_VALUE)
    expect(formatNumber('lots')).toBe(EMPTY_VALUE)
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe(EMPTY_VALUE)
  })
})

describe('formatAverage', () => {
  it('shows exactly 1 decimal', () => {
    expect(formatAverage(8)).toBe('8.0')
    expect(formatAverage(0)).toBe('0.0')
    expect(formatAverage(6.67)).toBe('6.7')
    expect(formatAverage(7.34)).toBe('7.3')
  })

  it('rounds exact halves up, like Postgres', () => {
    expect(formatAverage(7.25)).toBe('7.3')
    expect(formatAverage(7.35)).toBe('7.4')
    expect(formatAverage(9.95)).toBe('10.0')
  })

  it('reads numeric strings (avg_enjoyment is a Postgres numeric)', () => {
    expect(formatAverage('7.35')).toBe('7.4')
    expect(formatAverage('10.00')).toBe('10.0')
  })

  it('adds thousands separators for big averages', () => {
    expect(formatAverage(12345.67)).toBe('12,345.7')
  })

  it('shows a dash when there is no average', () => {
    expect(formatAverage(null)).toBe(EMPTY_VALUE)
    expect(formatAverage(undefined)).toBe(EMPTY_VALUE)
    expect(formatAverage(Number.NaN)).toBe(EMPTY_VALUE)
  })
})

describe('formatDuration', () => {
  it('shows minutes:seconds under an hour', () => {
    expect(formatDuration(142)).toBe('2:22')
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('shows hours:minutes:seconds from an hour up', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3723)).toBe('1:02:03')
    expect(formatDuration(36_000)).toBe('10:00:00')
  })

  it('rounds to whole seconds', () => {
    expect(formatDuration(61.4)).toBe('1:01')
    expect(formatDuration(61.6)).toBe('1:02')
    expect(formatDuration(3599.6)).toBe('1:00:00')
  })

  it('shows a dash for missing or impossible lengths', () => {
    expect(formatDuration(null)).toBe(EMPTY_VALUE)
    expect(formatDuration(undefined)).toBe(EMPTY_VALUE)
    expect(formatDuration(-1)).toBe(EMPTY_VALUE)
    expect(formatDuration(Number.NaN)).toBe(EMPTY_VALUE)
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe(EMPTY_VALUE)
  })
})

describe('difficulties', () => {
  it('lists all 11 gd_difficulty values, easiest to hardest (the Postgres enum order)', () => {
    expect(DIFFICULTIES).toEqual([
      'auto',
      'easy',
      'normal',
      'hard',
      'harder',
      'insane',
      'easy_demon',
      'medium_demon',
      'hard_demon',
      'insane_demon',
      'extreme_demon',
    ])
  })

  it.each([
    ['auto', 'Auto'],
    ['easy', 'Easy'],
    ['normal', 'Normal'],
    ['hard', 'Hard'],
    ['harder', 'Harder'],
    ['insane', 'Insane'],
    ['easy_demon', 'Easy Demon'],
    ['medium_demon', 'Medium Demon'],
    ['hard_demon', 'Hard Demon'],
    ['insane_demon', 'Insane Demon'],
    ['extreme_demon', 'Extreme Demon'],
  ] as const)('difficultyLabel(%s) = %s', (difficulty, label) => {
    expect(difficultyLabel(difficulty)).toBe(label)
  })

  it('gives every difficulty a different label', () => {
    expect(new Set(DIFFICULTIES.map(difficultyLabel)).size).toBe(DIFFICULTIES.length)
  })

  it('shows a dash for a missing difficulty', () => {
    expect(difficultyLabel(null)).toBe(EMPTY_VALUE)
    expect(difficultyLabel(undefined)).toBe(EMPTY_VALUE)
  })

  it('still gives a readable label for a value newer than this file', () => {
    expect(difficultyLabel('mythic_demon' as GdDifficulty)).toBe('Mythic Demon')
  })

  it('isDemon is true only for the five demon difficulties', () => {
    expect(DIFFICULTIES.filter(isDemon)).toEqual([
      'easy_demon',
      'medium_demon',
      'hard_demon',
      'insane_demon',
      'extreme_demon',
    ])
    expect(isDemon('insane')).toBe(false)
    expect(isDemon(null)).toBe(false)
    expect(isDemon(undefined)).toBe(false)
  })

  it('isDifficulty accepts only the enum values', () => {
    for (const difficulty of DIFFICULTIES) expect(isDifficulty(difficulty)).toBe(true)
    expect(isDifficulty('Extreme Demon')).toBe(false)
    expect(isDifficulty('extreme')).toBe(false)
    expect(isDifficulty('')).toBe(false)
    expect(isDifficulty(null)).toBe(false)
    expect(isDifficulty(3)).toBe(false)
  })
})
