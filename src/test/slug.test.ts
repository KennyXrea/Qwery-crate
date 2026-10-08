import { describe, expect, it } from 'vitest'
import { SLUG_MAX_LENGTH, SLUG_PATTERN, isValidSlug, slugify, uniqueSlug } from '../lib/slug'

// The SQL migrations, as text, to check the slug rule matches the database's.
const migrations = import.meta.glob<string>('../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Small seeded random generator so the "any input" tests are repeatable.
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    // Math.imul keeps the multiply exact; a plain * loses bits past 2^53 and the numbers
    // start repeating after about 10,000 draws.
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff
    return state / 2147483648
  }
}

const SAMPLE_CHARS = [
  ...'abcXYZ019 -_.,!?/\\\'"&%*@#\t\n',
  ...'éÉñÑüßẞæÆøØłŁđĐðþœıİçÅ',
  ...'ﬁＡ１²Ⅻ①',
  '­',
  '​',
  '日',
  'ب',
  '🎮',
  '́',
  '’',
  ' ',
]

function randomText(random: () => number, maxChars: number): string {
  const length = Math.floor(random() * maxChars)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += SAMPLE_CHARS[Math.floor(random() * SAMPLE_CHARS.length)]
  }
  return text
}

describe('slugify', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(slugify('Bloodbath')).toBe('bloodbath')
    expect(slugify('Sonic Wave Infinity')).toBe('sonic-wave-infinity')
    expect(slugify('  Hello,   World!!  ')).toBe('hello-world')
    expect(slugify('Level_Name.v2')).toBe('level-name-v2')
    expect(slugify('--a--b--')).toBe('a-b')
    expect(slugify('Zoink & more')).toBe('zoink-more')
    expect(slugify('a\tb\nc')).toBe('a-b-c')
    expect(slugify('123')).toBe('123')
    expect(slugify('Top 1 Level')).toBe('top-1-level')
  })

  it('strips accents', () => {
    expect(slugify('Pokémon Ñandú')).toBe('pokemon-nandu')
    expect(slugify('Crème Brûlée')).toBe('creme-brulee')
    expect(slugify('Ångström')).toBe('angstrom')
    expect(slugify('ÇA VA')).toBe('ca-va')
    expect(slugify('Zürich')).toBe('zurich')
    expect(slugify('Tiếng Việt')).toBe('tieng-viet')
    expect(slugify('İstanbul')).toBe('istanbul')
    // Already-separate accent marks are removed too.
    expect(slugify('Pokeḿon')).toBe('pokemon')
  })

  it('spells out letters that have no accent to strip', () => {
    expect(slugify('Straße')).toBe('strasse')
    expect(slugify('STRAẞE')).toBe('strasse')
    expect(slugify('Æther')).toBe('aether')
    expect(slugify('Œuvre')).toBe('oeuvre')
    expect(slugify('Søren Kierkegård')).toBe('soren-kierkegard')
    expect(slugify('ØRESUND')).toBe('oresund')
    expect(slugify('Łódź')).toBe('lodz')
    expect(slugify('Đorđe')).toBe('dorde')
    expect(slugify('Ðuro')).toBe('duro')
    expect(slugify('Þór')).toBe('thor')
    expect(slugify('ılık')).toBe('ilik')
    expect(slugify('ǿ')).toBe('o')
  })

  it('turns look-alike characters into plain letters and digits', () => {
    expect(slugify('ﬁnal')).toBe('final')
    expect(slugify('ＡＢＣ１２３')).toBe('abc123')
    expect(slugify('x²')).toBe('x2')
    expect(slugify('Level Ⅻ')).toBe('level-xii')
    expect(slugify('①')).toBe('1')
  })

  it('drops apostrophes instead of splitting the word', () => {
    expect(slugify("Bob's Level")).toBe('bobs-level')
    expect(slugify('Bob’s Level')).toBe('bobs-level')
    expect(slugify("'quoted'")).toBe('quoted')
  })

  it('ignores invisible formatting characters instead of splitting the word', () => {
    // Soft hyphen, zero-width space, word joiner, left-to-right mark: all invisible on screen.
    expect(slugify('Blood­bath')).toBe('bloodbath')
    expect(slugify('Blood​bath')).toBe('bloodbath')
    expect(slugify('Sonic⁠Wave')).toBe('sonicwave')
    expect(slugify('‎Sonic Wave‏')).toBe('sonic-wave')
    expect(slugify('﻿abc')).toBe('abc')
    expect(slugify('­​')).toBe('')
  })

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('!!!')).toBe('')
    expect(slugify('---')).toBe('')
    expect(slugify('日本語')).toBe('')
    expect(slugify('ميدان')).toBe('')
    expect(slugify('🎮🎮')).toBe('')
    expect(slugify("'")).toBe('')
  })

  it('keeps the usable parts of mixed text', () => {
    expect(slugify('日本語 Level 3')).toBe('level-3')
    expect(slugify('Level 日本 3')).toBe('level-3')
    expect(slugify('a🎮b')).toBe('a-b')
  })

  it('cuts to maxLength without leaving a hyphen at the end', () => {
    expect(slugify('abcdef', 3)).toBe('abc')
    expect(slugify('abc def', 3)).toBe('abc')
    expect(slugify('abc def', 4)).toBe('abc')
    expect(slugify('abc def', 5)).toBe('abc-d')
    expect(slugify('abc def', 7)).toBe('abc-def')
    expect(slugify('abc def', 100)).toBe('abc-def')
    expect(slugify('a b', 1)).toBe('a')
    expect(slugify('a b', 2)).toBe('a')
    // Accented letters count once they're plain letters.
    expect(slugify('ééé ééé', 4)).toBe('eee')
    // Spelled-out letters count as the letters they become.
    expect(slugify('ßßß', 5)).toBe('sssss')
  })

  it('checks every cut point of a longer title', () => {
    const full = slugify('The Quick Brown Fox Jumps')
    expect(full).toBe('the-quick-brown-fox-jumps')
    for (let max = 1; max <= full.length + 5; max++) {
      const cut = slugify('The Quick Brown Fox Jumps', max)
      expect(cut.length).toBeLessThanOrEqual(max)
      expect(isValidSlug(cut)).toBe(true)
      expect(full.startsWith(cut)).toBe(true)
      // Only a hyphen that would have been last gets dropped.
      expect(cut.length).toBeGreaterThanOrEqual(Math.min(max, full.length) - 1)
      if (max >= full.length) expect(cut).toBe(full)
    }
  })

  it(`uses ${SLUG_MAX_LENGTH} characters as the default maximum`, () => {
    expect(SLUG_MAX_LENGTH).toBe(80)
    expect(slugify('a'.repeat(200))).toBe('a'.repeat(80))
    const words = slugify('word '.repeat(40))
    expect(words.length).toBeLessThanOrEqual(80)
    expect(isValidSlug(words)).toBe(true)
    // "word-" × 16 is exactly 80 characters, so the cut lands right after a hyphen.
    expect(words).toBe(`${'word-'.repeat(15)}word`)
  })

  it('accepts an unlimited maxLength and rejects a maxLength below 1', () => {
    expect(slugify('a'.repeat(500), Number.POSITIVE_INFINITY)).toBe('a'.repeat(500))
    expect(() => slugify('abc', 0)).toThrow(RangeError)
    expect(() => slugify('abc', -5)).toThrow(RangeError)
    expect(() => slugify('abc', Number.NaN)).toThrow(RangeError)
  })

  it('always returns a valid slug or an empty string, and is stable when run twice', () => {
    const random = seededRandom(42)
    for (let i = 0; i < 2000; i++) {
      const text = randomText(random, 40)
      const maxLength = 1 + Math.floor(random() * 30)
      const slug = slugify(text, maxLength)
      if (slug !== '') expect(isValidSlug(slug), JSON.stringify(text)).toBe(true)
      expect(slug.length).toBeLessThanOrEqual(maxLength)
      expect(slugify(slug, maxLength)).toBe(slug)
    }
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase letters and digits joined by single hyphens', () => {
    for (const slug of ['a', '1', 'abc', 'a-b', 'level-2', 'a1-b2-c3', '2024-recap']) {
      expect(isValidSlug(slug), slug).toBe(true)
    }
  })

  it('rejects anything else', () => {
    const bad = ['', '-', '-a', 'a-', 'a--b', 'A', 'Abc', 'a b', 'a_b', 'a.b', 'é', 'a\n', 'a-\n']
    for (const slug of bad) {
      expect(isValidSlug(slug), JSON.stringify(slug)).toBe(false)
    }
  })

  it('uses the same rule as the database check on levels and players', () => {
    const checks = Object.values(migrations).flatMap((sql) =>
      [...sql.matchAll(/slug ~ '([^']+)'/g)].map((match) => match[1]),
    )
    // One check for levels.slug, one for players.slug.
    expect(checks.length).toBeGreaterThanOrEqual(2)
    for (const pattern of checks) expect(pattern).toBe(SLUG_PATTERN.source)
  })
})

describe('uniqueSlug', () => {
  it('returns the base when it is free', () => {
    expect(uniqueSlug('level', [])).toBe('level')
    expect(uniqueSlug('level', ['other', 'level-2'])).toBe('level')
  })

  it('adds -2, -3, … when the base is taken', () => {
    expect(uniqueSlug('level', ['level'])).toBe('level-2')
    expect(uniqueSlug('level', ['level', 'level-2'])).toBe('level-3')
    expect(uniqueSlug('level', ['level', 'level-2', 'level-3', 'level-4'])).toBe('level-5')
  })

  it('fills the first gap', () => {
    expect(uniqueSlug('level', ['level', 'level-3'])).toBe('level-2')
    expect(uniqueSlug('level', ['level', 'level-2', 'level-4'])).toBe('level-3')
  })

  it('handles many collisions', () => {
    const existing = ['level']
    for (let n = 2; n <= 500; n++) existing.push(`level-${n}`)
    expect(uniqueSlug('level', existing)).toBe('level-501')
  })

  it('slugifies the base first', () => {
    expect(uniqueSlug('My Level', [])).toBe('my-level')
    expect(uniqueSlug('My Level', ['my-level'])).toBe('my-level-2')
    expect(uniqueSlug('Pokémon', ['pokemon'])).toBe('pokemon-2')
  })

  it('treats a base that already ends in a number as a plain base', () => {
    expect(uniqueSlug('level-2', ['level-2'])).toBe('level-2-2')
    expect(uniqueSlug('Level 2', ['level', 'level-2'])).toBe('level-2-2')
  })

  it('accepts any iterable of existing slugs', () => {
    const existing = new Set(['level', 'level-2'])
    expect(uniqueSlug('level', existing)).toBe('level-3')
    expect(uniqueSlug('level', new Map([['level', 1]]).keys())).toBe('level-2')
    function* generated() {
      yield 'level'
      yield 'level-2'
      yield 'level-3'
    }
    expect(uniqueSlug('level', generated())).toBe('level-4')
  })

  it('returns an empty string when the base has nothing usable', () => {
    expect(uniqueSlug('', [])).toBe('')
    expect(uniqueSlug('!!!', ['a'])).toBe('')
    expect(uniqueSlug('日本語', [''])).toBe('')
  })

  it('shortens the base so the suffix fits in maxLength', () => {
    expect(uniqueSlug('abcdefghij', ['abcdefghij'], 10)).toBe('abcdefgh-2')
    expect(uniqueSlug('abcdefghij', ['abcdefghij', 'abcdefgh-2'], 10)).toBe('abcdefgh-3')

    const taken = ['abcdefghij']
    for (let n = 2; n <= 9; n++) taken.push(`abcdefgh-${n}`)
    // "-10" is one character longer, so the base loses one more.
    expect(uniqueSlug('abcdefghij', taken, 10)).toBe('abcdefg-10')
  })

  it('cuts a long base to maxLength before checking it', () => {
    expect(uniqueSlug('a'.repeat(100), [])).toBe('a'.repeat(80))
    expect(uniqueSlug('a'.repeat(100), ['a'.repeat(80)])).toBe(`${'a'.repeat(78)}-2`)
    expect(uniqueSlug('abcdefghijkl', [], 10)).toBe('abcdefghij')
  })

  it('never leaves a hyphen right before the suffix', () => {
    // Cut to 10: "abcdefg-hi". With "-2" there's room for 8: "abcdefg-" → "abcdefg".
    expect(uniqueSlug('abcdefg hij', ['abcdefg-hi'], 10)).toBe('abcdefg-2')
    expect(uniqueSlug('ab cd', ['ab-c'], 4)).toBe('ab-2')
    expect(uniqueSlug('a bcd', ['a-bc'], 4)).toBe('a-2')
  })

  it('gives distinct, valid, short-enough slugs over many collisions', () => {
    // The work grows with count², so only the short base goes up to a 4-digit suffix ("a-1000").
    // 1000 rounds for every base took over 5 seconds when the whole suite ran at once.
    for (const [base, maxLength, count, last] of [
      ['Extreme Demon Level Name That Is Really Long Indeed', 20, 200, 'extreme-demon-le-200'],
      ['x'.repeat(120), SLUG_MAX_LENGTH, 200, `${'x'.repeat(76)}-200`],
      ['abcdef', 6, 1000, 'a-1000'],
    ] as const) {
      const taken = new Set<string>()
      let slug = ''
      for (let i = 0; i < count; i++) {
        slug = uniqueSlug(base, taken, maxLength)
        expect(isValidSlug(slug)).toBe(true)
        expect(slug.length).toBeLessThanOrEqual(maxLength)
        expect(taken.has(slug)).toBe(false)
        taken.add(slug)
      }
      expect(taken.size).toBe(count)
      expect(slug).toBe(last)
    }
  })

  it('throws when maxLength is too short for any free numbered slug', () => {
    // maxLength 2: "-2" alone fills it, so nothing is left for the base.
    expect(() => uniqueSlug('ab', ['ab'], 2)).toThrow(RangeError)
    // maxLength 3: a-2 … a-9 are taken and "-10" leaves no room.
    const taken = ['abc']
    for (let n = 2; n <= 9; n++) taken.push(`a-${n}`)
    expect(uniqueSlug('abc', taken.slice(0, 5), 3)).toBe('a-6')
    expect(() => uniqueSlug('abc', taken, 3)).toThrow(RangeError)
    expect(() => uniqueSlug('abc', [], 0)).toThrow(RangeError)
  })
})
