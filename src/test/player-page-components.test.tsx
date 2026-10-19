import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CompletionsList } from '../components/player/CompletionsList'
import { CompletionsSortToggle } from '../components/player/CompletionsSortToggle'
import { DifficultyBreakdown } from '../components/player/DifficultyBreakdown'
import { MissingValue } from '../components/player/MissingValue'
import {
  DIFFICULTIES_HARDEST_FIRST,
  DIFFICULTY_SEGMENT_TONES,
  difficultyBreakdown,
  parseCompletionSort,
  PLAYER_SEARCH_DELAY_MS,
} from '../components/player/player-page-visuals'
import { PlayerSearchBox } from '../components/player/PlayerSearchBox'
import { PlayersTable } from '../components/player/PlayersTable'
import { DIFFICULTIES } from '../lib/format'
import { parsePageParam, withParam } from '../pages/player-params'
import type { Completion, GdDifficulty } from '../types/models'
import { TEST_COMPLETIONS, TEST_PLAYERS } from './api-mocks'
import { renderWithProviders } from './render'

const completion = (difficulty: GdDifficulty) => ({ level_difficulty: difficulty })

describe('difficultyBreakdown', () => {
  it('counts completions per difficulty, hardest first, leaving out empty ones', () => {
    expect(
      difficultyBreakdown([
        completion('hard'),
        completion('extreme_demon'),
        completion('easy_demon'),
        completion('extreme_demon'),
        completion('hard'),
        completion('hard'),
      ]),
    ).toEqual([
      { difficulty: 'extreme_demon', count: 2 },
      { difficulty: 'easy_demon', count: 1 },
      { difficulty: 'hard', count: 3 },
    ])
  })

  it('gives an empty list for no completions', () => {
    expect(difficultyBreakdown([])).toEqual([])
  })

  it('skips values the site does not know', () => {
    expect(difficultyBreakdown([completion('mythic_demon' as GdDifficulty)])).toEqual([])
  })

  it('orders every difficulty hardest first and has a colour for each', () => {
    expect(DIFFICULTIES_HARDEST_FIRST).toEqual([...DIFFICULTIES].reverse())
    for (const difficulty of DIFFICULTIES) {
      expect(DIFFICULTY_SEGMENT_TONES[difficulty]).toMatch(/^bg-/)
    }
  })
})

describe('URL parameter helpers', () => {
  it.each([
    [null, 1],
    [undefined, 1],
    ['', 1],
    ['  ', 1],
    ['1', 1],
    ['2', 2],
    ['2.7', 2],
    ['0', 1],
    ['-3', 1],
    ['abc', 1],
    ['Infinity', 1],
    ['1e9', 10_000],
  ])('parsePageParam(%j) → %d', (value, expected) => {
    expect(parsePageParam(value)).toBe(expected)
  })

  it.each([
    ['date', 'date'],
    ['position', 'position'],
    [null, 'position'],
    ['DATE', 'position'],
    ['newest', 'position'],
  ])('parseCompletionSort(%j) → %s', (value, expected) => {
    expect(parseCompletionSort(value)).toBe(expected)
  })

  it('withParam sets or removes one parameter on a copy', () => {
    const params = new URLSearchParams('q=alpha&page=3')
    expect(withParam(params, 'page', 4).toString()).toBe('q=alpha&page=4')
    expect(withParam(params, 'page', null).toString()).toBe('q=alpha')
    expect(withParam(params, 'q', '').toString()).toBe('page=3')
    expect(withParam(params, 'sort', 'date').toString()).toBe('q=alpha&page=3&sort=date')
    expect(params.toString()).toBe('q=alpha&page=3')
  })
})

describe('PlayerSearchBox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function input() {
    return screen.getByRole('searchbox', { name: 'Search players' })
  }

  it('searches once typing pauses', () => {
    const onSearch = vi.fn()
    render(<PlayerSearchBox value="" onSearch={onSearch} />)

    fireEvent.change(input(), { target: { value: 'al' } })
    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS - 50))
    fireEvent.change(input(), { target: { value: 'alp' } })
    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS - 50))
    expect(onSearch).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(50))
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('alp')
  })

  it('sends cleaned-up text, and nothing for text that changes no search', () => {
    const onSearch = vi.fn()
    render(<PlayerSearchBox value="" onSearch={onSearch} />)

    fireEvent.change(input(), { target: { value: '  Player   Alpha ' } })
    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS))
    expect(onSearch).toHaveBeenLastCalledWith('Player Alpha')
    // What was typed stays as it is.
    expect(input()).toHaveValue('  Player   Alpha ')

    onSearch.mockClear()
    fireEvent.change(input(), { target: { value: 'a' } })
    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS))
    // One letter is "no search", the same as the current value "".
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('searches straight away on Enter', () => {
    const onSearch = vi.fn()
    render(<PlayerSearchBox value="" onSearch={onSearch} />)

    fireEvent.change(input(), { target: { value: 'beta' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Players' }))
    expect(onSearch).toHaveBeenCalledWith('beta')
  })

  it('follows the value when it changes from outside', () => {
    const { rerender } = render(<PlayerSearchBox value="alpha" onSearch={vi.fn()} />)
    expect(input()).toHaveValue('alpha')

    rerender(<PlayerSearchBox value="" onSearch={vi.fn()} />)
    expect(input()).toHaveValue('')

    rerender(<PlayerSearchBox value="gamma" onSearch={vi.fn()} />)
    expect(input()).toHaveValue('gamma')
  })

  it('does not overwrite what is being typed when its own search comes back', () => {
    const onSearch = vi.fn()
    const { rerender } = render(<PlayerSearchBox value="" onSearch={onSearch} />)

    fireEvent.change(input(), { target: { value: 'alp' } })
    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS))
    expect(onSearch).toHaveBeenCalledWith('alp')

    // More typing before the page passes the new value back down.
    fireEvent.change(input(), { target: { value: 'alpha' } })
    rerender(<PlayerSearchBox value="alp" onSearch={onSearch} />)
    expect(input()).toHaveValue('alpha')

    act(() => vi.advanceTimersByTime(PLAYER_SEARCH_DELAY_MS))
    expect(onSearch).toHaveBeenLastCalledWith('alpha')
  })
})

describe('DifficultyBreakdown', () => {
  it('renders nothing without completions', () => {
    const { container } = render(<DifficultyBreakdown counts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws one segment per difficulty and names each in the legend', () => {
    render(
      <DifficultyBreakdown
        counts={[
          { difficulty: 'insane_demon', count: 3 },
          { difficulty: 'normal', count: 1 },
          { difficulty: 'easy', count: 0 },
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: 'Difficulty breakdown' })
    expect(region).toHaveTextContent('4 completions')
    const segments = region.querySelectorAll<HTMLElement>('[data-testid="difficulty-bar"] > div')
    expect([...segments].map((segment) => segment.dataset.difficulty)).toEqual([
      'insane_demon',
      'normal',
    ])
    expect(segments[0]).toHaveAttribute('title', 'Insane Demon: 3')
    expect(segments[0]?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByRole('list', { name: 'Completions by difficulty' })).toHaveTextContent(
      'Insane Demon3Normal1',
    )
  })
})

describe('CompletionsSortToggle', () => {
  it('marks the current order and reports a change', () => {
    const onChange = vi.fn()
    render(<CompletionsSortToggle value="position" onChange={onChange} />)

    const position = screen.getByRole('button', { name: 'Position' })
    const date = screen.getByRole('button', { name: 'Date' })
    expect(position).toHaveAttribute('aria-pressed', 'true')
    expect(date).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(position)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(date)
    expect(onChange).toHaveBeenCalledWith('date')
  })
})

describe('MissingValue', () => {
  it('shows a dash that screen readers hear as the label', () => {
    render(<MissingValue label="No video" />)
    const value = screen.getByTitle('No video')
    expect(value).toHaveTextContent('—No video')
    expect(value.querySelector('[aria-hidden="true"]')).toHaveTextContent('—')
  })
})

describe('tables', () => {
  it('PlayersTable gives every cell a phone label hidden from screen readers', () => {
    renderWithProviders(<PlayersTable players={TEST_PLAYERS} />)

    const table = screen.getByRole('table', { name: 'Players ranked by total points' })
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3)
    const labels = table.querySelectorAll('tbody [aria-hidden="true"].md\\:hidden')
    expect([...labels].map((label) => label.textContent)).toEqual(
      Array.from({ length: 3 }, () => ['Points', 'Completions', 'Hardest']).flat(),
    )
  })

  it('CompletionsList marks the sorted column', () => {
    renderWithProviders(
      <CompletionsList
        completions={TEST_COMPLETIONS.slice(0, 2) as Completion[]}
        sort="date"
        caption="Levels Player Alpha has beaten"
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Date' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('columnheader', { name: 'Rank' })).not.toHaveAttribute('aria-sort')
    expect(screen.getAllByRole('rowheader')).toHaveLength(2)
  })
})
