import { describe, expect, it } from 'vitest'
import {
  difficultyFromValue,
  DIFFICULTY_OPTIONS,
  pageCount,
  playerFilterOptions,
  rangeLabel,
  rangeSpoken,
  shownRange,
  SORT_OPTIONS,
  sortFromValue,
} from '../components/list/list-options'
import {
  CLEARED_FILTERS,
  DEFAULT_LIST_PARAMS,
  hasActiveFilters,
  hiddenFilterCount,
  isListView,
  isSameListParams,
  isSearchActive,
  listSearch,
  parseListParams,
  serializeListParams,
  tidySearchText,
  updateListParams,
  type ListParams,
} from '../components/list/list-params'
import { isLevelSort, LEVEL_SORTS } from '../api/levels'
import { isListSort, LEVEL_SORT_LABELS, LIST_SORTS } from '../components/list/list-sorts'

const FULL: ListParams = {
  section: 'extended',
  q: 'sample',
  difficulty: 'extreme_demon',
  player: 'player-alpha',
  sort: 'points',
  view: 'table',
  page: 2,
}

describe('parseListParams', () => {
  it('gives the defaults for an empty query', () => {
    expect(parseListParams('')).toEqual(DEFAULT_LIST_PARAMS)
    expect(parseListParams(new URLSearchParams())).toEqual(DEFAULT_LIST_PARAMS)
  })

  it('reads every parameter', () => {
    expect(
      parseListParams(
        '?section=extended&q=sample&difficulty=extreme_demon&player=player-alpha&sort=points&view=table&page=2',
      ),
    ).toEqual(FULL)
  })

  it('forgives upper case and spaces in keyword values', () => {
    expect(
      parseListParams('section=Legacy&difficulty=%20HARD_DEMON&sort=Victors&view=TABLE'),
    ).toMatchObject({ section: 'legacy', difficulty: 'hard_demon', sort: 'victors', view: 'table' })
  })

  it('falls back to the defaults for unknown values', () => {
    expect(
      parseListParams('section=bonus&difficulty=mythic&sort=random&view=grid&page=abc'),
    ).toEqual(DEFAULT_LIST_PARAMS)
  })

  it.each([
    ['1', 1],
    ['3', 3],
    [' 7 ', 7],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['2e3', 1],
    ['', 1],
    ['99999999', 10_000],
    ['999999999999999999999', 1],
  ])('reads page=%j as %i', (raw, page) => {
    expect(parseListParams(new URLSearchParams({ page: raw })).page).toBe(page)
  })

  it('tidies the search text but keeps a single character', () => {
    expect(parseListParams('q=%20%20sample%20%20%20level%20').q).toBe('sample level')
    expect(parseListParams('q=a').q).toBe('a')
    expect(parseListParams('q=%20%20').q).toBe('')
    expect(parseListParams(`q=${'x'.repeat(150)}`).q).toHaveLength(100)
  })

  it('lower-cases the player slug and ignores a blank one', () => {
    expect(parseListParams('player=%20Player-Alpha%20').player).toBe('player-alpha')
    expect(parseListParams('player=').player).toBeNull()
    expect(parseListParams('player=%20%20').player).toBeNull()
  })

  it('uses the first value of a repeated parameter', () => {
    expect(parseListParams('section=legacy&section=extended').section).toBe('legacy')
  })
})

describe('serializeListParams', () => {
  it('leaves out every default value', () => {
    expect(serializeListParams(DEFAULT_LIST_PARAMS).toString()).toBe('')
    expect(listSearch({ ...DEFAULT_LIST_PARAMS })).toBe('')
  })

  it('writes the parameters in a fixed order', () => {
    expect(serializeListParams(FULL).toString()).toBe(
      'section=extended&q=sample&difficulty=extreme_demon&player=player-alpha&sort=points&view=table&page=2',
    )
    expect(listSearch({ ...DEFAULT_LIST_PARAMS, view: 'table' })).toBe('?view=table')
  })

  it('encodes search text safely', () => {
    const query = serializeListParams({ ...DEFAULT_LIST_PARAMS, q: 'a&b=c #1' }).toString()
    expect(query).toBe('q=a%26b%3Dc+%231')
    expect(parseListParams(query).q).toBe('a&b=c #1')
  })

  it('round-trips through parseListParams', () => {
    for (const params of [DEFAULT_LIST_PARAMS, FULL, { ...FULL, section: 'main' as const }]) {
      expect(parseListParams(serializeListParams(params))).toEqual(params)
    }
  })

  it('never writes page 1 or a broken page', () => {
    expect(serializeListParams({ ...DEFAULT_LIST_PARAMS, page: 1 }).has('page')).toBe(false)
    expect(serializeListParams({ ...DEFAULT_LIST_PARAMS, page: Number.NaN }).has('page')).toBe(
      false,
    )
  })
})

describe('updateListParams', () => {
  const onPage3: ListParams = { ...DEFAULT_LIST_PARAMS, page: 3 }

  it.each<[string, Partial<ListParams>]>([
    ['section', { section: 'legacy' }],
    ['search', { q: 'sample' }],
    ['difficulty', { difficulty: 'insane_demon' }],
    ['player', { player: 'player-beta' }],
    ['sort', { sort: 'enjoyment' }],
  ])('goes back to page 1 when the %s changes', (_name, patch) => {
    expect(updateListParams(onPage3, patch)).toEqual({ ...onPage3, ...patch, page: 1 })
  })

  it('keeps the page when only the view changes', () => {
    expect(updateListParams(onPage3, { view: 'table' })).toEqual({ ...onPage3, view: 'table' })
  })

  it('keeps the page when a filter is "changed" to the value it already has', () => {
    expect(updateListParams(onPage3, { section: 'main', q: '  ' })).toEqual(onPage3)
    expect(updateListParams({ ...onPage3, q: 'abc' }, { q: ' abc ' })).toEqual({
      ...onPage3,
      q: 'abc',
    })
  })

  it('sets the page', () => {
    expect(updateListParams(onPage3, { page: 5 }).page).toBe(5)
    expect(updateListParams(onPage3, { section: 'legacy', page: 2 }).page).toBe(2)
  })

  it('tidies what it is given', () => {
    expect(
      updateListParams(DEFAULT_LIST_PARAMS, { q: '  two   words ', player: 'Player-A' }),
    ).toMatchObject({ q: 'two words', player: 'player-a' })
  })

  it('clears the filters with CLEARED_FILTERS, keeping the section, sort and view', () => {
    expect(updateListParams(FULL, CLEARED_FILTERS)).toEqual({
      ...FULL,
      q: '',
      difficulty: null,
      player: null,
      page: 1,
    })
  })
})

describe('small helpers', () => {
  it('isSameListParams compares what the URL would say', () => {
    expect(isSameListParams(FULL, { ...FULL })).toBe(true)
    expect(isSameListParams(FULL, { ...FULL, page: 3 })).toBe(false)
    expect(isSameListParams(DEFAULT_LIST_PARAMS, { ...DEFAULT_LIST_PARAMS, q: '   ' })).toBe(true)
  })

  it('isListView knows the two views', () => {
    expect(isListView('cards')).toBe(true)
    expect(isListView('table')).toBe(true)
    expect(isListView('grid')).toBe(false)
    expect(isListView(undefined)).toBe(false)
  })

  it('tidySearchText collapses spaces and drops control characters', () => {
    expect(tidySearchText(' \t a \n b ')).toBe('a b')
    expect(tidySearchText('a\u0000b')).toBe('a b')
    expect(tidySearchText('😀'.repeat(120))).toBe('😀'.repeat(100))
  })

  it('isSearchActive needs 2 characters', () => {
    expect(isSearchActive('')).toBe(false)
    expect(isSearchActive('a')).toBe(false)
    expect(isSearchActive('ab')).toBe(true)
  })

  it('hasActiveFilters looks at search, difficulty and player only', () => {
    expect(hasActiveFilters(DEFAULT_LIST_PARAMS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_LIST_PARAMS, sort: 'points', view: 'table' })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_LIST_PARAMS, q: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_LIST_PARAMS, difficulty: 'easy' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_LIST_PARAMS, player: 'x' })).toBe(true)
  })

  it('hiddenFilterCount counts what hides behind the phone Filters button', () => {
    expect(hiddenFilterCount(DEFAULT_LIST_PARAMS)).toBe(0)
    expect(hiddenFilterCount(FULL)).toBe(3)
    expect(hiddenFilterCount({ ...DEFAULT_LIST_PARAMS, q: 'search is not hidden' })).toBe(0)
  })
})

describe('control options', () => {
  it('knows exactly the sorts of the API, in the same order', () => {
    expect(LIST_SORTS).toEqual(LEVEL_SORTS)
    for (const value of [...LEVEL_SORTS, 'rank', 'Points', '', 'toString', '__proto__', null, 3]) {
      expect(isListSort(value)).toBe(isLevelSort(value))
    }
  })

  it('has a friendly label for every sort, in the API order', () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([...LEVEL_SORTS])
    for (const sort of LEVEL_SORTS) expect(LEVEL_SORT_LABELS[sort]).toMatch(/^[A-Z]/)
    expect(sortFromValue('points')).toBe('points')
    expect(sortFromValue('nonsense')).toBe('position')
  })

  it('lists the difficulties hardest first', () => {
    expect(DIFFICULTY_OPTIONS[0]).toEqual({ value: 'extreme_demon', label: 'Extreme Demon' })
    expect(DIFFICULTY_OPTIONS.at(-1)).toEqual({ value: 'auto', label: 'Auto' })
    expect(DIFFICULTY_OPTIONS).toHaveLength(11)
    expect(difficultyFromValue('hard')).toBe('hard')
    expect(difficultyFromValue('')).toBeNull()
  })

  describe('playerFilterOptions', () => {
    const players = [
      { name: 'zed', slug: 'zed', rank: 2 },
      { name: 'Player Beta', slug: 'player-beta', rank: 1 },
      { name: 'Unranked', slug: 'unranked', rank: null },
      { name: 'amy', slug: 'amy', rank: 3 },
    ]

    it('lists ranked players A–Z by name', () => {
      expect(playerFilterOptions(players, null).map((option) => option.label)).toEqual([
        'amy',
        'Player Beta',
        'zed',
      ])
    })

    it('keeps the selected player even without a rank', () => {
      expect(playerFilterOptions(players, 'unranked').map((option) => option.value)).toEqual([
        'amy',
        'player-beta',
        'unranked',
        'zed',
      ])
    })

    it('adds a selected player that is not in the list, by name when known', () => {
      expect(
        playerFilterOptions([], 'player-alpha', { name: 'Player Alpha', slug: 'player-alpha' }),
      ).toEqual([{ value: 'player-alpha', label: 'Player Alpha' }])
      expect(playerFilterOptions([], 'ghost')).toEqual([{ value: 'ghost', label: 'ghost' }])
    })
  })
})

describe('result helpers', () => {
  it('formats section ranges', () => {
    expect(rangeLabel({ start: 1, end: 25 })).toBe('#1–25')
    expect(rangeLabel({ start: 51, end: null })).toBe('#51+')
    expect(rangeLabel({ start: 7, end: 7 })).toBe('#7')
    expect(rangeSpoken({ start: 1, end: 25 })).toBe('positions 1 to 25')
    expect(rangeSpoken({ start: 51, end: null })).toBe('position 51 and below')
    expect(rangeSpoken({ start: 7, end: 7 })).toBe('position 7')
  })

  it('counts pages and the rows a page shows', () => {
    expect(pageCount(0, 25)).toBe(1)
    expect(pageCount(25, 25)).toBe(1)
    expect(pageCount(26, 25)).toBe(2)
    expect(pageCount(61, 25)).toBe(3)
    expect(shownRange(1, 25, 25)).toEqual({ from: 1, to: 25 })
    expect(shownRange(3, 25, 11)).toEqual({ from: 51, to: 61 })
  })
})
