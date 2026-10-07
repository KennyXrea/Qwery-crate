import { describe, expect, it } from 'vitest'
import { clampPage, getPageItems } from '../components/ui/pagination-utils'
import type { PageItem } from '../components/ui/pagination-utils'

const E1 = 'ellipsis-start'
const E2 = 'ellipsis-end'

function numbersOf(items: PageItem[]): number[] {
  return items.filter((item): item is number => typeof item === 'number')
}

describe('getPageItems — edge cases', () => {
  it('returns an empty list when there are no pages', () => {
    expect(getPageItems(1, 0)).toEqual([])
    expect(getPageItems(1, -3)).toEqual([])
    expect(getPageItems(1, 0.5)).toEqual([])
    expect(getPageItems(1, Number.NaN)).toEqual([])
    expect(getPageItems(1, Number.POSITIVE_INFINITY)).toEqual([])
  })

  it('returns [1] for a single page, whatever the requested page', () => {
    expect(getPageItems(1, 1)).toEqual([1])
    expect(getPageItems(0, 1)).toEqual([1])
    expect(getPageItems(5, 1)).toEqual([1])
    expect(getPageItems(Number.NaN, 1)).toEqual([1])
  })

  it('rounds a fractional page count down', () => {
    expect(getPageItems(1, 3.9)).toEqual([1, 2, 3])
    expect(getPageItems(1, 1.99)).toEqual([1])
  })
})

describe('getPageItems — few pages', () => {
  it('lists every page when they all fit (siblings = 1 → up to 7)', () => {
    expect(getPageItems(1, 2)).toEqual([1, 2])
    expect(getPageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
    for (let page = 1; page <= 7; page++) {
      expect(getPageItems(page, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    }
  })

  it('lists every page when they all fit (siblings = 0 → up to 5, siblings = 2 → up to 9)', () => {
    expect(getPageItems(3, 5, 0)).toEqual([1, 2, 3, 4, 5])
    expect(getPageItems(5, 9, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('getPageItems — many pages (siblings = 1)', () => {
  it('shows the start of the range and an end ellipsis near the first page', () => {
    expect(getPageItems(1, 10)).toEqual([1, 2, 3, 4, 5, E2, 10])
    expect(getPageItems(2, 10)).toEqual([1, 2, 3, 4, 5, E2, 10])
    expect(getPageItems(3, 10)).toEqual([1, 2, 3, 4, 5, E2, 10])
    expect(getPageItems(4, 10)).toEqual([1, 2, 3, 4, 5, E2, 10])
  })

  it('shows ellipses on both sides in the middle', () => {
    expect(getPageItems(5, 10)).toEqual([1, E1, 4, 5, 6, E2, 10])
    expect(getPageItems(6, 10)).toEqual([1, E1, 5, 6, 7, E2, 10])
    expect(getPageItems(50, 100)).toEqual([1, E1, 49, 50, 51, E2, 100])
  })

  it('shows the end of the range and a start ellipsis near the last page', () => {
    expect(getPageItems(7, 10)).toEqual([1, E1, 6, 7, 8, 9, 10])
    expect(getPageItems(9, 10)).toEqual([1, E1, 6, 7, 8, 9, 10])
    expect(getPageItems(10, 10)).toEqual([1, E1, 6, 7, 8, 9, 10])
  })

  it('handles the smallest page count that needs an ellipsis (8)', () => {
    expect(getPageItems(1, 8)).toEqual([1, 2, 3, 4, 5, E2, 8])
    expect(getPageItems(4, 8)).toEqual([1, 2, 3, 4, 5, E2, 8])
    expect(getPageItems(5, 8)).toEqual([1, E1, 4, 5, 6, 7, 8])
    expect(getPageItems(8, 8)).toEqual([1, E1, 4, 5, 6, 7, 8])
  })
})

describe('getPageItems — other sibling counts', () => {
  it('works with siblings = 0', () => {
    expect(getPageItems(1, 10, 0)).toEqual([1, 2, 3, E2, 10])
    expect(getPageItems(3, 10, 0)).toEqual([1, 2, 3, E2, 10])
    expect(getPageItems(4, 10, 0)).toEqual([1, E1, 4, E2, 10])
    expect(getPageItems(8, 10, 0)).toEqual([1, E1, 8, 9, 10])
    expect(getPageItems(10, 10, 0)).toEqual([1, E1, 8, 9, 10])
  })

  it('works with siblings = 2', () => {
    expect(getPageItems(1, 20, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, E2, 20])
    expect(getPageItems(10, 20, 2)).toEqual([1, E1, 8, 9, 10, 11, 12, E2, 20])
    expect(getPageItems(20, 20, 2)).toEqual([1, E1, 14, 15, 16, 17, 18, 19, 20])
  })

  it('treats negative or fractional siblings sensibly', () => {
    expect(getPageItems(5, 10, -2)).toEqual(getPageItems(5, 10, 0))
    expect(getPageItems(5, 10, 1.8)).toEqual(getPageItems(5, 10, 1))
    expect(getPageItems(5, 10, Number.NaN)).toEqual(getPageItems(5, 10, 1))
  })

  it('shows every page when siblings is huge', () => {
    expect(getPageItems(3, 12, Number.POSITIVE_INFINITY)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    )
  })
})

describe('getPageItems — clamping the current page', () => {
  it('treats pages below 1 (and NaN) as page 1', () => {
    const first = getPageItems(1, 10)
    expect(getPageItems(0, 10)).toEqual(first)
    expect(getPageItems(-5, 10)).toEqual(first)
    expect(getPageItems(Number.NaN, 10)).toEqual(first)
    expect(getPageItems(Number.NEGATIVE_INFINITY, 10)).toEqual(first)
  })

  it('treats pages past the end as the last page', () => {
    const last = getPageItems(10, 10)
    expect(getPageItems(11, 10)).toEqual(last)
    expect(getPageItems(999, 10)).toEqual(last)
    expect(getPageItems(Number.POSITIVE_INFINITY, 10)).toEqual(last)
  })

  it('rounds a fractional page down', () => {
    expect(getPageItems(5.9, 10)).toEqual(getPageItems(5, 10))
  })
})

describe('getPageItems — invariants', () => {
  for (const siblings of [0, 1, 2, 3]) {
    for (const totalPages of [1, 2, 6, 7, 8, 9, 10, 11, 15, 37]) {
      it(`holds for every page of ${totalPages} with siblings = ${siblings}`, () => {
        const fits = totalPages <= 2 * siblings + 5
        for (let page = 1; page <= totalPages; page++) {
          const items = getPageItems(page, totalPages, siblings)
          const numbers = numbersOf(items)

          // First, last and current page are always present.
          expect(items[0]).toBe(1)
          expect(items[items.length - 1]).toBe(totalPages)
          expect(numbers).toContain(page)

          // Neighbours of the current page are shown (within range).
          for (let d = 1; d <= siblings; d++) {
            if (page - d >= 1) expect(numbers).toContain(page - d)
            if (page + d <= totalPages) expect(numbers).toContain(page + d)
          }

          // Numbers are strictly increasing and unique.
          for (let i = 1; i < numbers.length; i++) {
            expect(numbers[i]).toBeGreaterThan(numbers[i - 1])
          }

          // Constant length once it overflows; otherwise every page.
          expect(items).toHaveLength(fits ? totalPages : 2 * siblings + 5)

          // Each ellipsis hides at least two pages, and consecutive numbers have no gap.
          for (let i = 1; i < items.length; i++) {
            const prev = items[i - 1]
            const item = items[i]
            if (typeof item === 'number' && typeof prev === 'number') {
              expect(item).toBe(prev + 1)
            }
            if (typeof item !== 'number') {
              const before = items[i - 1]
              const after = items[i + 1]
              expect(typeof before).toBe('number')
              expect(typeof after).toBe('number')
              if (typeof before === 'number' && typeof after === 'number') {
                expect(after - before).toBeGreaterThanOrEqual(3)
              }
            }
          }

          // At most one of each ellipsis, start before end.
          expect(items.filter((x) => x === E1).length).toBeLessThanOrEqual(1)
          expect(items.filter((x) => x === E2).length).toBeLessThanOrEqual(1)
          if (items.includes(E1) && items.includes(E2)) {
            expect(items.indexOf(E1)).toBeLessThan(items.indexOf(E2))
          }
        }
      })
    }
  }
})

describe('clampPage', () => {
  it('keeps pages inside 1…totalPages', () => {
    expect(clampPage(3, 10)).toBe(3)
    expect(clampPage(0, 10)).toBe(1)
    expect(clampPage(-1, 10)).toBe(1)
    expect(clampPage(11, 10)).toBe(10)
    expect(clampPage(Number.NaN, 10)).toBe(1)
    expect(clampPage(2.7, 10)).toBe(2)
  })

  it('never returns less than 1, even for an empty range', () => {
    expect(clampPage(4, 0)).toBe(1)
  })
})
