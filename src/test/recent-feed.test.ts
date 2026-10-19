import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RECENT_FILTERS,
  dayHeading,
  feedSummary,
  groupChangesByDay,
  localDayKey,
  pageCount,
  parsePageParam,
  previousDayKey,
  readRecentParams,
  recentFilterOf,
  withPage,
} from '../pages/recent-feed'
import type { RecentChange } from '../types/models'
import { TEST_RECENT_CHANGES } from './api-mocks'

afterEach(() => {
  vi.unstubAllEnvs()
})

function change(index: number, eventDate: string): RecentChange {
  const base = TEST_RECENT_CHANGES[index % TEST_RECENT_CHANGES.length] as RecentChange
  return { ...base, id: `${base.id}-${index}`, event_date: eventDate }
}

describe('readRecentParams', () => {
  it('reads a valid kind and page', () => {
    expect(readRecentParams(new URLSearchParams('kind=record&page=3'))).toEqual({
      kind: 'record',
      page: 3,
    })
    expect(readRecentParams(new URLSearchParams('kind=level_moved'))).toEqual({
      kind: 'level_moved',
      page: 1,
    })
  })

  it('treats a missing or unknown kind as "all"', () => {
    expect(readRecentParams(new URLSearchParams('')).kind).toBeNull()
    for (const kind of ['bogus', 'RECORD', 'shifted', '', 'toString', '__proto__']) {
      expect(readRecentParams(new URLSearchParams({ kind })).kind).toBeNull()
    }
  })
})

describe('parsePageParam', () => {
  it('accepts plain whole numbers from 1', () => {
    expect(parsePageParam('1')).toBe(1)
    expect(parsePageParam('2')).toBe(2)
    expect(parsePageParam(' 7 ')).toBe(7)
  })

  it('falls back to page 1 for anything else', () => {
    for (const value of [null, '', '0', '-2', '1.5', 'abc', '2e3', 'Infinity', '0x10', '+3']) {
      expect(parsePageParam(value)).toBe(1)
    }
  })

  it('caps absurd pages', () => {
    expect(parsePageParam('999999999')).toBe(10_000)
  })
})

describe('withPage', () => {
  it('sets the page and keeps the filter', () => {
    expect(withPage(new URLSearchParams('kind=record'), 3).toString()).toBe('kind=record&page=3')
  })

  it('drops the parameter for page 1', () => {
    expect(withPage(new URLSearchParams('kind=record&page=4'), 1).toString()).toBe('kind=record')
  })

  it('does not change the params it was given', () => {
    const params = new URLSearchParams('page=2')
    withPage(params, 5)
    expect(params.toString()).toBe('page=2')
  })
})

describe('pageCount', () => {
  it('rounds up and is at least 1', () => {
    expect(pageCount(0, 30)).toBe(1)
    expect(pageCount(30, 30)).toBe(1)
    expect(pageCount(31, 30)).toBe(2)
    expect(pageCount(65, 30)).toBe(3)
    expect(pageCount(Number.NaN, 30)).toBe(1)
  })
})

describe('filters', () => {
  it('lists All, Completions, New levels and Moves in order', () => {
    expect(RECENT_FILTERS.map((filter) => [filter.label, filter.kind])).toEqual([
      ['All', null],
      ['Completions', 'record'],
      ['New levels', 'level_added'],
      ['Moves', 'level_moved'],
    ])
  })

  it('finds the chip for a kind', () => {
    expect(recentFilterOf(null).label).toBe('All')
    expect(recentFilterOf('level_added').label).toBe('New levels')
  })
})

describe('feedSummary', () => {
  it('gives just the count when everything fits on one page', () => {
    expect(feedSummary(recentFilterOf(null), 1, 30, 13, 13)).toBe('13 changes')
    expect(feedSummary(recentFilterOf('record'), 1, 30, 1, 1)).toBe('1 completion')
  })

  it('gives the range on longer feeds', () => {
    expect(feedSummary(recentFilterOf(null), 1, 30, 30, 65)).toBe('Showing 1–30 of 65 changes')
    expect(feedSummary(recentFilterOf('level_moved'), 3, 30, 5, 65)).toBe(
      'Showing 61–65 of 65 moves',
    )
    expect(feedSummary(recentFilterOf(null), 1, 30, 30, 1234)).toBe('Showing 1–30 of 1,234 changes')
  })
})

describe('localDayKey', () => {
  it("uses the viewer's own calendar day, not the UTC one (west of UTC)", () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    // 10 pm on Sep 30 in California is already Oct 1 in UTC.
    const lateEvening = new Date('2026-10-01T05:00:00Z')
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-10-01')
    expect(localDayKey(lateEvening)).toBe('2026-09-30')
  })

  it("uses the viewer's own calendar day, not the UTC one (east of UTC)", () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati') // UTC+14
    const morning = new Date('2026-09-30T11:00:00Z')
    expect(localDayKey(morning)).toBe('2026-10-01')
  })

  it('pads months, days and short years', () => {
    expect(localDayKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
    const early = new Date(2026, 0, 5, 12)
    early.setFullYear(987)
    expect(localDayKey(early)).toBe('0987-01-05')
  })
})

describe('previousDayKey', () => {
  it('steps back one calendar day across months, years and leap days', () => {
    expect(previousDayKey('2026-10-08')).toBe('2026-10-07')
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2028-03-01')).toBe('2028-02-29')
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
  })

  it('gives null for anything that is not a real date', () => {
    expect(previousDayKey('2026-02-30')).toBeNull()
    expect(previousDayKey('yesterday')).toBeNull()
    expect(previousDayKey('')).toBeNull()
  })
})

describe('dayHeading', () => {
  const today = '2026-10-08'

  it('says Today and Yesterday, with the full date next to them', () => {
    expect(dayHeading('2026-10-08', today)).toEqual({
      label: 'Today',
      detail: 'Thursday, Oct 8, 2026',
    })
    expect(dayHeading('2026-10-07', today)).toEqual({
      label: 'Yesterday',
      detail: 'Wednesday, Oct 7, 2026',
    })
  })

  it('shows older (and future) days as their date', () => {
    expect(dayHeading('2026-09-02', today)).toEqual({
      label: 'Wednesday, Sep 2, 2026',
      detail: null,
    })
    expect(dayHeading('2026-10-09', today).label).toBe('Friday, Oct 9, 2026')
  })

  it('works across a month and year boundary', () => {
    expect(dayHeading('2025-12-31', '2026-01-01').label).toBe('Yesterday')
  })

  it('keeps the calendar day in every time zone', () => {
    for (const zone of ['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
      vi.stubEnv('TZ', zone)
      expect(dayHeading('2026-09-02', today).label).toBe('Wednesday, Sep 2, 2026')
    }
  })

  it('copes with an unreadable date', () => {
    expect(dayHeading('not a date', today)).toEqual({ label: 'Unknown date', detail: null })
  })
})

describe('groupChangesByDay', () => {
  it('groups runs of the same day and keeps the order inside each day', () => {
    const changes = [
      change(0, '2026-10-08'),
      change(1, '2026-10-08'),
      change(2, '2026-10-07'),
      change(3, '2026-09-02'),
      change(4, '2026-09-02'),
    ]
    const groups = groupChangesByDay(changes)

    expect(groups.map((group) => group.day)).toEqual(['2026-10-08', '2026-10-07', '2026-09-02'])
    expect(groups[0]?.changes).toEqual([changes[0], changes[1]])
    expect(groups[2]?.changes).toEqual([changes[3], changes[4]])
  })

  it('gives no groups for no changes', () => {
    expect(groupChangesByDay([])).toEqual([])
  })
})
