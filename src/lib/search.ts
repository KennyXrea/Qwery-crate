/**
 * Helpers for search boxes. Rules match the SQL function search_site() in
 * supabase/migrations/…_functions_views.sql: a term needs 2 to 100 characters.
 */

/** Shorter terms are treated as "no search" (search_site returns nothing for them). */
export const MIN_SEARCH_LENGTH = 2

/** Longer terms are cut to this length (search_site returns nothing for longer input). */
export const MAX_SEARCH_LENGTH = 100

/**
 * Cleans up what someone typed: trims it, turns every run of spaces, tabs, newlines or
 * control characters into one space, and cuts it to MAX_SEARCH_LENGTH characters.
 * Returns '' when fewer than MIN_SEARCH_LENGTH characters are left, so callers can simply
 * skip the search when the result is empty.
 * Lengths count Unicode characters (code points) like Postgres does, so an emoji counts as one
 * and is never cut in half.
 */
export function normalizeSearch(input: string): string {
  const cleaned = input
    // Half of an emoji on its own (a lone surrogate) isn't valid text for the database.
    .replace(/\p{Cs}/gu, '')
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .trim()
  const chars = Array.from(cleaned)
  if (chars.length < MIN_SEARCH_LENGTH) return ''
  if (chars.length <= MAX_SEARCH_LENGTH) return cleaned
  // Trim again so the cut can't leave a space at the end.
  return chars.slice(0, MAX_SEARCH_LENGTH).join('').trimEnd()
}

/**
 * Makes text safe to put inside a LIKE / ILIKE pattern so it only matches itself:
 * \, % and _ get a backslash in front (backslash is Postgres' default LIKE escape).
 *
 * '*' becomes '_' (any one character). PostgREST's like/ilike filters treat '*' as '%' and
 * give no way to escape it, so a literal '*' can't be searched exactly. '_' still matches the
 * '*' itself, and otherwise just one character in its place instead of '%' matching anything.
 *
 * Use it with a PostgREST filter: `.ilike('name', containsPattern(q))`. Never build `.or()`
 * filter strings from user text.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_*]/g, (char) => (char === '*' ? '_' : `\\${char}`))
}

/** An ILIKE pattern matching names that contain `text` anywhere: `%<escaped text>%`. */
export function containsPattern(text: string): string {
  return `%${escapeLike(text)}%`
}
