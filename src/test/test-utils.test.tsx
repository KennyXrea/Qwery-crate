import { screen } from '@testing-library/react'
import { useParams } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isApiError } from '../api/errors'
import { getLevelBySlug, getLevels } from '../api/levels'
import { getPlayers } from '../api/players'
import { getRecentChanges } from '../api/recent'
import { getRecentRecords } from '../api/records'
import { searchSite } from '../api/search'
import { getSiteStats } from '../api/stats'
import { supabase } from '../lib/supabase'
import {
  EMPTY_TEST_DATA,
  TEST_COMPLETIONS,
  TEST_LEVELS,
  TEST_PLAYERS,
  TEST_RECENT_CHANGES,
  mockApiDefaults,
} from './api-mocks'
import { OFFLINE_MESSAGE } from './offline-supabase'
import { createTestQueryClient, renderApp, renderWithProviders } from './render'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('no network in tests', () => {
  it('src/lib/supabase is the offline stand-in, and an unmocked API call fails cleanly', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(getLevels()).rejects.toSatisfy(isApiError)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(OFFLINE_MESSAGE))
    const session = await supabase.auth.getSession()
    expect(session.data.session).toBeNull()
  })

  it('every API function is a spy a test can stub without its own vi.mock', () => {
    for (const fn of [getLevels, getPlayers, getRecentChanges, getRecentRecords, searchSite]) {
      expect(vi.isMockFunction(fn)).toBe(true)
    }
  })
})

describe('mockApiDefaults', () => {
  it('answers like the real API: sections, filters, paging', async () => {
    mockApiDefaults()

    const extended = await getLevels({ section: 'extended' })
    expect(extended.rows.map((level) => level.position)).toEqual([4, 5])
    expect(extended.total).toBe(2)

    const beatenByBeta = await getLevels({ playerId: TEST_PLAYERS[1]?.id })
    expect(beatenByBeta.rows.map((level) => level.name)).toEqual([
      'Sample Level 1',
      'Sample Level 3',
    ])

    const page2 = await getLevels({ page: 2, pageSize: 4 })
    expect(page2).toMatchObject({ total: 6 })
    expect(page2.rows.map((level) => level.position)).toEqual([5, 6])

    expect(await getLevelBySlug('sample-level-2')).toMatchObject({ position: 2 })
    expect(await getLevelBySlug('nope')).toBeNull()
    expect((await searchSite('alpha')).map((result) => result.name)).toEqual(['Player Alpha'])
    expect(await getSiteStats()).toMatchObject({ levels: 6, players: 3, records: 5 })
  })

  it('keeps the fake dataset consistent', () => {
    // Player totals are the sums of their levels' points.
    for (const player of TEST_PLAYERS) {
      const records = TEST_COMPLETIONS.filter((record) => record.player_id === player.id)
      const sum = records.reduce((total, record) => total + record.level_points, 0)
      expect(player.total_points).toBeCloseTo(sum, 2)
      expect(player.completions).toBe(records.length)
    }
    // Victor counts match the records.
    for (const level of TEST_LEVELS) {
      expect(level.victor_count).toBe(
        TEST_COMPLETIONS.filter((record) => record.level_id === level.id).length,
      )
    }
    // The newest change is the completion entered without a date.
    expect(TEST_RECENT_CHANGES[0]).toMatchObject({ kind: 'record', level_slug: 'sample-level-4' })
    expect(TEST_LEVELS.map((level) => level.section)).toEqual([
      'main',
      'main',
      'main',
      'extended',
      'extended',
      'legacy',
    ])
    expect(TEST_LEVELS[5]?.points).toBe(0)
  })

  it('can serve an empty site, and one function can be overridden afterwards', async () => {
    mockApiDefaults(EMPTY_TEST_DATA)
    expect(await getLevels()).toEqual({ rows: [], total: 0 })

    vi.mocked(getLevels).mockResolvedValueOnce({ rows: [TEST_LEVELS[0]!], total: 1 })
    expect((await getLevels()).total).toBe(1)
    expect((await getLevels()).total).toBe(0)
  })
})

function ShowSlug() {
  const { slug } = useParams()
  return <p>slug: {slug}</p>
}

describe('render helpers', () => {
  it('renderWithProviders mounts the element at a route pattern', () => {
    const { router, queryClient } = renderWithProviders(<ShowSlug />, {
      path: '/level/:slug',
      route: '/level/sample-level-1',
    })
    expect(screen.getByText('slug: sample-level-1')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/level/sample-level-1')
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false)
  })

  it('renderApp renders the real site', async () => {
    mockApiDefaults()
    renderApp('/about')
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('makes a fresh query client every time', () => {
    expect(createTestQueryClient()).not.toBe(createTestQueryClient())
  })
})
