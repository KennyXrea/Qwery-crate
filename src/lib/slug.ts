/**
 * URL slugs for levels and players (`/level/<slug>`, `/player/<slug>`).
 * A valid slug is what the database check allows: lowercase letters and digits in groups
 * joined by single hyphens, e.g. "bloodbath-2". No leading, trailing or double hyphens.
 */

/** The same rule as the `slug` check constraint in supabase/migrations/…_schema.sql. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Default longest slug we generate. The database doesn't limit length; this keeps URLs tidy. */
export const SLUG_MAX_LENGTH = 80

// Letters that Unicode doesn't split into "base letter + accent", so stripping accents
// alone would drop them. Applied after lowercasing.
const SPECIAL_LETTERS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
  ħ: 'h',
  ŧ: 't',
  ŋ: 'ng',
  ĸ: 'k',
  ƒ: 'f',
}
const SPECIAL_LETTER_RE = new RegExp(`[${Object.keys(SPECIAL_LETTERS).join('')}]`, 'g')

// Apostrophes are dropped instead of becoming a hyphen: "Bob's" → "bobs", not "bob-s".
const APOSTROPHE_RE = /['‘’ʼ]/g

function checkMaxLength(maxLength: number): void {
  // Written this way so NaN fails too.
  if (!(maxLength >= 1)) {
    throw new RangeError(`maxLength must be at least 1 (got ${maxLength})`)
  }
}

/** Cuts a valid slug to at most `maxLength` characters without leaving a trailing hyphen. */
function cutSlug(slug: string, maxLength: number): string {
  return slug.slice(0, maxLength).replace(/-+$/, '')
}

/**
 * Turns any text into a slug: "Pokémon Ñandú" → "pokemon-nandu", "Straße" → "strasse".
 * Accents are removed, everything else that isn't a-z or 0-9 becomes a hyphen, and the result
 * is cut to `maxLength` characters. Returns '' when nothing usable is left (e.g. "!!!" or
 * "日本語"), so callers must handle that case.
 */
export function slugify(text: string, maxLength: number = SLUG_MAX_LENGTH): string {
  checkMaxLength(maxLength)
  const slug = text
    // NFKD splits "é" into "e" + accent mark and turns look-alikes such as "ﬁ", "Ａ" or "²"
    // into plain "fi", "A" and "2". Then the marks are removed, along with invisible
    // formatting characters (soft hyphens, zero-width spaces) so they don't split a word.
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .toLowerCase()
    .replace(SPECIAL_LETTER_RE, (letter) => SPECIAL_LETTERS[letter] ?? '')
    .replace(APOSTROPHE_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cutSlug(slug, maxLength)
}

/** True when `value` is allowed as a slug by the database (see SLUG_PATTERN). */
export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

/**
 * Returns `base` (slugified) if no existing slug uses it, otherwise the first free one of
 * base-2, base-3, … The base is shortened when needed so the whole slug, suffix included,
 * stays within `maxLength`. Returns '' when `base` has no usable characters (see slugify).
 * Throws a RangeError if `maxLength` is too short to fit any free numbered slug.
 */
export function uniqueSlug(
  base: string,
  existing: Iterable<string>,
  maxLength: number = SLUG_MAX_LENGTH,
): string {
  const slug = slugify(base, maxLength)
  if (slug === '') return ''

  const taken = new Set(existing)
  if (!taken.has(slug)) return slug

  // Each number gives a different slug (the number is always the last part), so this
  // finds a free one within taken.size + 1 tries.
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const room = maxLength - suffix.length
    if (room < 1) {
      throw new RangeError(`No free slug for "${slug}" fits in ${maxLength} characters`)
    }
    const candidate = cutSlug(slug, room) + suffix
    if (!taken.has(candidate)) return candidate
  }
}
