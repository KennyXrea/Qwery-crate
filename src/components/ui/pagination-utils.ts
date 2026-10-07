export type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
}

/** Clamps a page number into 1…totalPages (fractions round down, NaN → 1). Assumes totalPages ≥ 1. */
export function clampPage(page: number, totalPages: number): number {
  const total = Math.max(1, Math.floor(totalPages))
  return Math.min(Math.max(Number.isNaN(page) ? 1 : Math.floor(page), 1), total)
}

/**
 * The page buttons to show for a pager, e.g. page 5 of 10 → [1, '…', 4, 5, 6, '…', 10].
 *
 * - Always includes the first and last page, the current page and `siblings` pages on each side.
 * - Once there are more pages than fit, the list always has the same length (2 × siblings + 5),
 *   so the control doesn't jump around while you click through it.
 * - An ellipsis never hides just one page — that page number is shown instead.
 * - `page` is clamped into 1…totalPages; fractional values are rounded down.
 * - Returns [] when there are no pages, and [1] for a single page.
 */
export function getPageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
  if (!Number.isFinite(totalPages) || totalPages < 1) return []

  const total = Math.floor(totalPages)
  const current = clampPage(page, total)
  const sib = Number.isNaN(siblings) ? 1 : Math.max(0, Math.floor(siblings))

  // first + last + current + two ellipses + siblings on both sides
  const slots = 2 * sib + 5
  if (total <= slots) return range(1, total)

  // Window of pages around the current one, kept clear of the first two and last two slots.
  const start = Math.max(Math.min(current - sib, total - 2 * sib - 2), 3)
  const end = Math.min(Math.max(current + sib, 2 * sib + 3), total - 2)

  return [
    1,
    start > 3 ? 'ellipsis-start' : 2,
    ...range(start, end),
    end < total - 2 ? 'ellipsis-end' : total - 1,
    total,
  ]
}
