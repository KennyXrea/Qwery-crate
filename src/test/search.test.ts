import { describe, expect, it } from 'vitest'
import {
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  containsPattern,
  escapeLike,
  normalizeSearch,
} from '../lib/search'

// The SQL migrations, as text, to check the limits match search_site().
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

function randomText(random: () => number, alphabet: string[], maxChars: number): string {
  const length = Math.floor(random() * maxChars)
  let text = ''
  for (let i = 0; i < length; i++) text += alphabet[Math.floor(random() * alphabet.length)]
  return text
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/**
 * What the database does with `.ilike('name', pattern)`: PostgREST turns every '*' into '%',
 * then Postgres ILIKE runs with its default escape character '\'.
 */
function postgrestIlike(pattern: string, value: string): boolean {
  const chars = Array.from(pattern.replaceAll('*', '%'))
  let source = ''
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === '\\') {
      i++
      if (i >= chars.length) throw new Error('LIKE pattern must not end with escape character')
      source += escapeRegExp(chars[i])
    } else if (char === '%') {
      source += '[\\s\\S]*'
    } else if (char === '_') {
      source += '[\\s\\S]'
    } else {
      source += escapeRegExp(char)
    }
  }
  return new RegExp(`^${source}$`, 'iu').test(value)
}

/** How search_site() escapes its input in SQL. */
function sqlEscape(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

describe('normalizeSearch', () => {
  it('uses the limits from search_site()', () => {
    expect(MIN_SEARCH_LENGTH).toBe(2)
    expect(MAX_SEARCH_LENGTH).toBe(100)
    const limits = Object.values(migrations)
      .map((sql) => /length\(btrim\(q\)\) between (\d+) and (\d+)/.exec(sql))
      .find((match) => match !== null)
    expect(limits?.slice(1).map(Number)).toEqual([MIN_SEARCH_LENGTH, MAX_SEARCH_LENGTH])
  })

  it('trims and collapses whitespace', () => {
    expect(normalizeSearch('  hello   world  ')).toBe('hello world')
    expect(normalizeSearch('a\tb\nc\r\nd')).toBe('a b c d')
    expect(normalizeSearch('\u00a0non\u00a0breaking\u3000space\u2028')).toBe('non breaking space')
  })

  it('turns control characters into spaces and drops broken emoji halves', () => {
    expect(normalizeSearch('a\u0000b')).toBe('a b')
    expect(normalizeSearch('\u0000ab\u007f')).toBe('ab')
    expect(normalizeSearch('ab\ud800')).toBe('ab')
    expect(normalizeSearch('a\udc00b')).toBe('ab')
    expect(normalizeSearch('\ud800a')).toBe('')
  })

  it('leaves case, punctuation and LIKE characters alone', () => {
    expect(normalizeSearch('Bloodbath')).toBe('Bloodbath')
    expect(normalizeSearch("100% _done_ \\o/ *star* Bob's")).toBe("100% _done_ \\o/ *star* Bob's")
    expect(normalizeSearch('Pokémon')).toBe('Pokémon')
  })

  it(`returns '' for fewer than ${MIN_SEARCH_LENGTH} characters`, () => {
    expect(normalizeSearch('')).toBe('')
    expect(normalizeSearch('   ')).toBe('')
    expect(normalizeSearch('a')).toBe('')
    expect(normalizeSearch('  a  ')).toBe('')
    expect(normalizeSearch('\n\t')).toBe('')
    expect(normalizeSearch('ab')).toBe('ab')
    expect(normalizeSearch(' a b ')).toBe('a b')
  })

  it(`cuts to ${MAX_SEARCH_LENGTH} characters`, () => {
    expect(normalizeSearch('a'.repeat(100))).toBe('a'.repeat(100))
    expect(normalizeSearch('a'.repeat(101))).toBe('a'.repeat(100))
    expect(normalizeSearch('a'.repeat(5000))).toBe('a'.repeat(100))
    // Collapsing happens first, so spaces don't use up the limit.
    expect(normalizeSearch(`ab${' '.repeat(500)}cd`)).toBe('ab cd')
  })

  it('never ends with a space after cutting', () => {
    // 99 letters, a space, then more: the cut lands right after the space.
    expect(normalizeSearch(`${'a'.repeat(99)} bcd`)).toBe('a'.repeat(99))
  })

  it('counts an emoji as one character and never cuts one in half', () => {
    expect(normalizeSearch('👍')).toBe('')
    expect(normalizeSearch('👍👍')).toBe('👍👍')
    const cut = normalizeSearch(`a${'👍'.repeat(150)}`)
    expect(Array.from(cut)).toHaveLength(100)
    expect(cut).toBe(`a${'👍'.repeat(99)}`)
    expect(/\p{Cs}/u.test(cut)).toBe(false)
  })

  it('always returns a tidy term that search_site() accepts, or an empty string', () => {
    const random = seededRandom(7)
    const alphabet = [...'ab Z9%_*\\', '\t', '\n', '\u00a0', '\u0000', '👍', '\ud800', 'é']
    for (let i = 0; i < 2000; i++) {
      const input = randomText(random, alphabet, i % 10 === 0 ? 300 : 30)
      const term = normalizeSearch(input)
      expect(normalizeSearch(term)).toBe(term)
      if (term === '') continue
      const length = Array.from(term).length
      expect(length).toBeGreaterThanOrEqual(MIN_SEARCH_LENGTH)
      expect(length).toBeLessThanOrEqual(MAX_SEARCH_LENGTH)
      expect(term).toBe(term.trim())
      expect(term).not.toMatch(/\s\s|[^\S ]|\p{Cc}|\p{Cs}/u)
    }
  })
})

describe('escapeLike', () => {
  it('leaves ordinary text unchanged', () => {
    expect(escapeLike('')).toBe('')
    expect(escapeLike('Bloodbath')).toBe('Bloodbath')
    expect(escapeLike("Bob's level (v2) [hard], a.b")).toBe("Bob's level (v2) [hard], a.b")
  })

  it('puts a backslash before \\, % and _', () => {
    expect(escapeLike('%')).toBe('\\%')
    expect(escapeLike('_')).toBe('\\_')
    expect(escapeLike('\\')).toBe('\\\\')
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
    expect(escapeLike('\\%')).toBe('\\\\\\%')
  })

  it("turns * into _ because PostgREST reads * as % and can't escape it", () => {
    expect(escapeLike('*')).toBe('_')
    expect(escapeLike('a*b')).toBe('a_b')
    expect(escapeLike('**')).toBe('__')
    // The backslash is escaped on its own; the * still becomes a plain _.
    expect(escapeLike('\\*')).toBe('\\\\_')
    expect(escapeLike('*_*')).toBe('_\\__')
  })

  it('escapes exactly like search_site() does in SQL', () => {
    const random = seededRandom(11)
    const alphabet = [...'ab%_\\ .', 'é']
    for (let i = 0; i < 500; i++) {
      const text = randomText(random, alphabet, 20)
      expect(escapeLike(text)).toBe(sqlEscape(text))
    }
  })
})

describe('containsPattern', () => {
  it('wraps the escaped text in %', () => {
    expect(containsPattern('abc')).toBe('%abc%')
    expect(containsPattern('50%')).toBe('%50\\%%')
    expect(containsPattern('a*b')).toBe('%a_b%')
    expect(containsPattern('')).toBe('%%')
  })

  it('makes PostgREST ilike find names containing the text literally', () => {
    expect(postgrestIlike(containsPattern('blood'), 'Bloodbath')).toBe(true)
    expect(postgrestIlike(containsPattern('BATH'), 'Bloodbath')).toBe(true)
    expect(postgrestIlike(containsPattern('50%'), 'Only 50% done')).toBe(true)
    expect(postgrestIlike(containsPattern('50%'), 'Only 500 done')).toBe(false)
    expect(postgrestIlike(containsPattern('a_b'), 'xa_by')).toBe(true)
    expect(postgrestIlike(containsPattern('a_b'), 'xacby')).toBe(false)
    expect(postgrestIlike(containsPattern('c:\\x'), 'path c:\\x here')).toBe(true)
    expect(postgrestIlike(containsPattern('c:\\x'), 'path c:x here')).toBe(false)
  })

  it('lets * match itself or exactly one other character, never any run of text', () => {
    expect(postgrestIlike(containsPattern('a*b'), 'xa*by')).toBe(true)
    expect(postgrestIlike(containsPattern('a*b'), 'xacby')).toBe(true)
    expect(postgrestIlike(containsPattern('a*b'), 'xaby')).toBe(false)
    expect(postgrestIlike(containsPattern('a*b'), 'xaccby')).toBe(false)
    // Without the swap, PostgREST would read "a*b" as "a%b" and match this.
    expect(postgrestIlike('%a*b%', 'xaccby')).toBe(true)
  })

  it('matches exactly the names that contain the text (ignoring case)', () => {
    const random = seededRandom(3)
    const alphabet = [...'aAbB%_\\. ']
    for (let i = 0; i < 3000; i++) {
      const query = randomText(random, alphabet, 4)
      const name = randomText(random, alphabet, 8)
      const expected = name.toLowerCase().includes(query.toLowerCase())
      expect(postgrestIlike(containsPattern(query), name), `${query} in ${name}`).toBe(expected)
    }
  })

  it('still finds every name that contains a query with *', () => {
    const random = seededRandom(5)
    const alphabet = [...'ab*%_\\']
    for (let i = 0; i < 3000; i++) {
      const query = randomText(random, alphabet, 4)
      const name = randomText(random, alphabet, 8)
      if (name.includes(query)) {
        expect(postgrestIlike(containsPattern(query), name), `${query} in ${name}`).toBe(true)
      }
    }
  })
})
