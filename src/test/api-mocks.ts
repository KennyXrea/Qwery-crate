/**
 * A small, consistent FAKE dataset plus one call that makes every src/api data function answer
 * from it — for page and component tests, with no network.
 *
 *   import { mockApiDefaults, TEST_LEVELS } from './api-mocks'
 *   beforeEach(() => mockApiDefaults())               // the dataset below
 *   beforeEach(() => mockApiDefaults(EMPTY_TEST_DATA)) // every list empty (empty states)
 *
 * It works because src/test/setup.ts wraps every src/api data module in spies, so no vi.mock
 * lines are needed in the test file. To change one function for one test, after
 * mockApiDefaults():
 *
 *   vi.mocked(getLevels).mockRejectedValueOnce(apiNetworkError())   // error state
 *   vi.mocked(getLevelBySlug).mockReturnValue(pendingForever())     // loading skeleton
 *   vi.mocked(getLevelBySlug).mockResolvedValue(null)               // "Level not found"
 *
 * The dataset (all fake, like the seed data): settings Main = #1–3, Extended = #4–5,
 * Legacy = #6+; six "Sample Level N" (#1–#6); Player Alpha (US, rank 1), Player Beta (SE,
 * rank 2) and Player Gamma (no completions, no rank); five completions (one without a date or
 * attempts, one with a YouTube video, one with a Medal video); position history; and the
 * matching Recent changes feed. Don't modify these objects in a test — build new ones.
 */
import { vi } from 'vitest'
import { ApiError, NETWORK_CODE, NETWORK_MESSAGE } from '../api/errors'
import * as levelsApi from '../api/levels'
import {
  toCompletion,
  toLevel,
  toPlayer,
  toPositionHistoryEntry,
  toRecentChange,
} from '../api/mappers'
import * as playersApi from '../api/players'
import * as recentApi from '../api/recent'
import * as recordsApi from '../api/records'
import { pageWindow } from '../api/request'
import * as searchApi from '../api/search'
import * as settingsApi from '../api/settings'
import * as statsApi from '../api/stats'
import { levelPoints, levelSection, pointsSettingsFromRow } from '../lib/points'
import { normalizeSearch } from '../lib/search'
import type {
  Completion,
  GdDifficulty,
  Level,
  Page,
  Player,
  PositionHistoryEntry,
  RecentChange,
  RecentRecordChange,
  SearchResult,
  SiteSettings,
  SiteStats,
} from '../types/models'
import {
  historyRow,
  levelRow,
  playerRow,
  recentLevelRow,
  recentRecordRow,
  recordRow,
} from './api-fixtures'

// ── The dataset ───────────────────────────────────────────────────────────────────────────────

export type TestData = {
  settings: SiteSettings
  levels: Level[]
  players: Player[]
  completions: Completion[]
  history: PositionHistoryEntry[]
  recentChanges: RecentChange[]
}

/** Ids look like real ones (uuid v4 shape) so isUuid() accepts them. */
export const testLevelId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const testPlayerId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const recordId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const historyId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const TEST_SETTINGS: SiteSettings = {
  ...settingsApi.DEFAULT_SITE_SETTINGS,
  main_list_size: 3,
  extended_list_size: 2,
}
const POINTS = pointsSettingsFromRow(TEST_SETTINGS)
const pointsAt = (position: number) => levelPoints(position, null, POINTS) ?? 0

export const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
export const TEST_MEDAL_URL = 'https://medal.tv/games/geometry-dash/clips/sample'

type LevelSpec = {
  n: number
  difficulty: GdDifficulty
  creator: string | null
  victors: number
  enjoyment: number | null
  attempts: number | null
  first: { player: 1 | 2; date: string | null } | null
}

const LEVEL_SPECS: LevelSpec[] = [
  {
    n: 1,
    difficulty: 'extreme_demon',
    creator: 'Creator Alpha',
    victors: 2,
    enjoyment: 8,
    attempts: 13000,
    first: { player: 1, date: '2026-01-05' },
  },
  {
    n: 2,
    difficulty: 'extreme_demon',
    creator: 'Creator Beta',
    victors: 1,
    enjoyment: 7,
    attempts: 9000,
    first: { player: 1, date: '2026-03-01' },
  },
  {
    n: 3,
    difficulty: 'insane_demon',
    creator: null,
    victors: 1,
    enjoyment: 6.5,
    attempts: 5000,
    first: { player: 2, date: '2026-03-20' },
  },
  {
    n: 4,
    difficulty: 'hard_demon',
    creator: 'Creator Alpha',
    victors: 1,
    enjoyment: null,
    attempts: null,
    first: { player: 1, date: null },
  },
  {
    n: 5,
    difficulty: 'medium_demon',
    creator: 'Creator Gamma',
    victors: 0,
    enjoyment: null,
    attempts: null,
    first: null,
  },
  {
    n: 6,
    difficulty: 'easy_demon',
    creator: 'Creator Beta',
    victors: 0,
    enjoyment: null,
    attempts: null,
    first: null,
  },
]

const PLAYER_NAMES = ['Player Alpha', 'Player Beta', 'Player Gamma'] as const
const playerSlug = (n: number) => (PLAYER_NAMES[n - 1] ?? '').toLowerCase().replace(' ', '-')

export const TEST_LEVELS: Level[] = LEVEL_SPECS.map((spec) =>
  toLevel(
    levelRow({
      id: testLevelId(spec.n),
      position: spec.n,
      name: `Sample Level ${spec.n}`,
      slug: `sample-level-${spec.n}`,
      gd_level_id: 1000000 + spec.n,
      creator: spec.creator,
      verifier: spec.first ? PLAYER_NAMES[spec.first.player - 1] : null,
      difficulty: spec.difficulty,
      difficulty_rating: 10 - spec.n / 2,
      length_seconds: 60 + spec.n * 15,
      description: spec.n === 1 ? 'The hardest fake level on the list.' : null,
      notes: spec.n === 1 ? 'Sample notes for testing.' : null,
      section: levelSection(spec.n, POINTS),
      points: pointsAt(spec.n),
      victor_count: spec.victors,
      avg_enjoyment: spec.enjoyment,
      avg_attempts: spec.attempts,
      first_victor_id: spec.first ? testPlayerId(spec.first.player) : null,
      first_victor_name: spec.first ? PLAYER_NAMES[spec.first.player - 1] : null,
      first_victor_slug: spec.first ? playerSlug(spec.first.player) : null,
      first_victory_date: spec.first?.date ?? null,
      first_victor_video_url: spec.n === 1 ? TEST_YOUTUBE_URL : null,
      created_at: `2026-01-0${spec.n}T12:00:00+00:00`,
      updated_at: `2026-01-0${spec.n}T12:00:00+00:00`,
    }),
  ),
)

type RecordSpec = {
  n: number
  player: 1 | 2
  level: number
  date: string | null
  attempts: number | null
  enjoyment: number | null
  video: string | null
  first: boolean
  entered: string
}

const RECORD_SPECS: RecordSpec[] = [
  {
    n: 1,
    player: 1,
    level: 1,
    date: '2026-01-05',
    attempts: 12000,
    enjoyment: 8,
    video: TEST_YOUTUBE_URL,
    first: true,
    entered: '2026-01-06T10:00:00+00:00',
  },
  {
    n: 2,
    player: 2,
    level: 1,
    date: '2026-02-10',
    attempts: 14000,
    enjoyment: 8,
    video: null,
    first: false,
    entered: '2026-02-10T18:00:00+00:00',
  },
  {
    n: 3,
    player: 1,
    level: 2,
    date: '2026-03-01',
    attempts: 9000,
    enjoyment: 7,
    video: TEST_MEDAL_URL,
    first: true,
    entered: '2026-03-02T09:00:00+00:00',
  },
  {
    n: 4,
    player: 2,
    level: 3,
    date: '2026-03-20',
    attempts: 5000,
    enjoyment: 6.5,
    video: null,
    first: true,
    entered: '2026-03-21T20:00:00+00:00',
  },
  {
    n: 5,
    player: 1,
    level: 4,
    date: null,
    attempts: null,
    enjoyment: null,
    video: null,
    first: true,
    entered: '2026-09-30T12:00:00+00:00',
  },
]

const levelOf = (n: number) => TEST_LEVELS[n - 1] as Level

export const TEST_COMPLETIONS: Completion[] = RECORD_SPECS.map((spec) => {
  const level = levelOf(spec.level)
  return toCompletion(
    recordRow({
      id: recordId(spec.n),
      level_id: level.id,
      player_id: testPlayerId(spec.player),
      attempts: spec.attempts,
      enjoyment: spec.enjoyment,
      date_beaten: spec.date,
      video_url: spec.video,
      notes: spec.n === 1 ? 'First try at 12k, sample note.' : null,
      created_at: spec.entered,
      updated_at: spec.entered,
      level_name: level.name,
      level_slug: level.slug,
      level_position: level.position,
      level_section: level.section,
      level_points: level.points,
      level_difficulty: level.difficulty,
      player_name: PLAYER_NAMES[spec.player - 1],
      player_slug: playerSlug(spec.player),
      player_country_code: spec.player === 1 ? 'US' : 'SE',
      is_first_victory: spec.first,
    }),
  )
})

function playerTotals(n: number) {
  const done = TEST_COMPLETIONS.filter((record) => record.player_id === testPlayerId(n))
  const attempts = done.flatMap((record) => (record.attempts === null ? [] : [record.attempts]))
  const ratings = done.flatMap((record) => (record.enjoyment === null ? [] : [record.enjoyment]))
  const hardest = [...done].sort((a, b) => a.level_position - b.level_position)[0]
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
  return {
    total_points: Math.round(sum(done.map((record) => record.level_points)) * 100) / 100,
    completions: done.length,
    first_victories: done.filter((record) => record.is_first_victory).length,
    total_attempts: attempts.length ? sum(attempts) : null,
    avg_enjoyment: ratings.length ? sum(ratings) / ratings.length : null,
    hardest_level_id: hardest?.level_id ?? null,
    hardest_level_name: hardest?.level_name ?? null,
    hardest_level_slug: hardest?.level_slug ?? null,
    hardest_level_position: hardest?.level_position ?? null,
  }
}

export const TEST_PLAYERS: Player[] = [1, 2, 3].map((n) =>
  toPlayer(
    playerRow({
      id: testPlayerId(n),
      name: PLAYER_NAMES[n - 1],
      slug: playerSlug(n),
      country_code: n === 1 ? 'US' : n === 2 ? 'SE' : null,
      channel_url: n === 1 ? 'https://www.youtube.com/@sample-player-alpha' : null,
      bio: n === 1 ? 'A fake player for tests.' : null,
      rank: n === 3 ? null : n,
      ...playerTotals(n),
    }),
  ),
)

type HistorySpec = [level: number, old: number | null, next: number, reason: string, at: string]

const HISTORY_SPECS: HistorySpec[] = [
  [1, null, 1, 'added', '2026-01-01T12:00:00+00:00'],
  [2, null, 2, 'added', '2026-01-02T12:00:00+00:00'],
  [3, null, 2, 'added', '2026-01-03T12:00:00+00:00'],
  [2, 2, 3, 'shifted', '2026-01-03T12:00:00+00:00'],
  [4, null, 4, 'added', '2026-01-04T12:00:00+00:00'],
  [5, null, 5, 'added', '2026-01-05T12:00:00+00:00'],
  [6, null, 5, 'added', '2026-01-06T12:00:00+00:00'],
  [5, 5, 6, 'shifted', '2026-01-06T12:00:00+00:00'],
  [3, 2, 3, 'moved', '2026-09-01T12:00:00+00:00'],
  [2, 3, 2, 'shifted', '2026-09-01T12:00:00+00:00'],
  [6, 5, 6, 'moved', '2026-09-02T12:00:00+00:00'],
  [5, 6, 5, 'shifted', '2026-09-02T12:00:00+00:00'],
]

export const TEST_HISTORY: PositionHistoryEntry[] = HISTORY_SPECS.map(
  ([level, old, next, reason, at], i) =>
    toPositionHistoryEntry(
      historyRow({
        id: historyId(i + 1),
        level_id: testLevelId(level),
        old_position: old,
        new_position: next,
        reason,
        changed_at: at,
        seq: i + 1,
      }),
    ),
)

/** Same order as recent_changes_view is read: event_date, happened_at (newest first), kind, id. */
function byFeedOrder(a: RecentChange, b: RecentChange): number {
  return (
    b.event_date.localeCompare(a.event_date) ||
    b.happened_at.localeCompare(a.happened_at) ||
    a.kind.localeCompare(b.kind) ||
    a.id.localeCompare(b.id)
  )
}

export const TEST_RECENT_CHANGES: RecentChange[] = [
  ...TEST_COMPLETIONS.map((record) =>
    toRecentChange(
      recentRecordRow({
        id: record.id,
        happened_at: record.created_at,
        // Like the view: a record without a date counts from the day it was entered.
        event_date: record.date_beaten ?? record.created_at.slice(0, 10),
        level_id: record.level_id,
        level_name: record.level_name,
        level_slug: record.level_slug,
        player_id: record.player_id,
        player_name: record.player_name,
        player_slug: record.player_slug,
        attempts: record.attempts,
        video_url: record.video_url,
      }),
    ),
  ),
  ...TEST_HISTORY.filter((entry) => entry.reason !== 'shifted').map((entry) => {
    const level = TEST_LEVELS.find((candidate) => candidate.id === entry.level_id) as Level
    return toRecentChange(
      recentLevelRow({
        id: entry.id,
        kind: entry.reason === 'added' ? 'level_added' : 'level_moved',
        happened_at: entry.changed_at,
        event_date: entry.changed_at.slice(0, 10),
        level_id: level.id,
        level_name: level.name,
        level_slug: level.slug,
        old_position: entry.old_position,
        new_position: entry.new_position,
      }),
    )
  }),
].sort(byFeedOrder)

export const TEST_DATA: TestData = {
  settings: TEST_SETTINGS,
  levels: TEST_LEVELS,
  players: TEST_PLAYERS,
  completions: TEST_COMPLETIONS,
  history: TEST_HISTORY,
  recentChanges: TEST_RECENT_CHANGES,
}

/** No levels, players or records at all (for empty states). Settings are the defaults. */
export const EMPTY_TEST_DATA: TestData = {
  settings: { ...settingsApi.DEFAULT_SITE_SETTINGS },
  levels: [],
  players: [],
  completions: [],
  history: [],
  recentChanges: [],
}

// ── Small helpers for tests ───────────────────────────────────────────────────────────────────

/** The ApiError a failed request gives when the internet is down (for error-state tests). */
export function apiNetworkError(): ApiError {
  return new ApiError({ kind: 'network', code: NETWORK_CODE, message: NETWORK_MESSAGE })
}

/** A promise that never settles: the query stays loading, so the skeleton stays on screen. */
export function pendingForever<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

// ── Answering the src/api functions from a dataset ────────────────────────────────────────────

function paged<T>(
  rows: T[],
  page: number | undefined,
  pageSize: number | undefined,
  size?: number,
) {
  const window = pageWindow(page, pageSize, size)
  return { rows: rows.slice(window.from, window.to + 1), total: rows.length } satisfies Page<T>
}

const nullsLast = (value: number | null) => (value === null ? -Infinity : value)

const LEVEL_SORT_KEYS: Readonly<Record<levelsApi.LevelSort, (level: Level) => number>> = {
  position: () => 0,
  points: (level) => level.points,
  enjoyment: (level) => nullsLast(level.avg_enjoyment),
  attempts: (level) => nullsLast(level.avg_attempts),
  victors: (level) => level.victor_count,
  newest: (level) => Date.parse(level.created_at),
}

function answers(data: TestData) {
  return {
    getSettings: async () => data.settings,

    getLevels: async (params: levelsApi.GetLevelsParams = {}) => {
      const search = normalizeSearch(params.search ?? '').toLowerCase()
      const beaten = params.playerId
        ? new Set(
            data.completions
              .filter((record) => record.player_id === params.playerId?.trim().toLowerCase())
              .map((record) => record.level_id),
          )
        : null
      const sortKey = LEVEL_SORT_KEYS[levelsApi.isLevelSort(params.sort) ? params.sort : 'position']
      const rows = data.levels
        .filter((level) => !params.section || level.section === params.section)
        .filter((level) => !params.difficulty || level.difficulty === params.difficulty)
        .filter((level) => search === '' || level.name.toLowerCase().includes(search))
        .filter((level) => !beaten || beaten.has(level.id))
        .sort((a, b) => sortKey(b) - sortKey(a) || a.position - b.position)
      return paged(rows, params.page, params.pageSize)
    },

    getLevelBySlug: async (slug: string) =>
      data.levels.find((level) => level.slug === slug) ?? null,

    getLevelRecords: async (levelId: string) =>
      data.completions
        .filter((record) => record.level_id === levelId)
        .sort(
          (a, b) =>
            (a.date_beaten ?? '9999').localeCompare(b.date_beaten ?? '9999') ||
            a.created_at.localeCompare(b.created_at),
        ),

    getLevelHistory: async (levelId: string) =>
      data.history
        .filter((entry) => entry.level_id === levelId)
        .sort((a, b) => b.changed_at.localeCompare(a.changed_at) || b.seq - a.seq),

    getAdjacentLevels: async (position: number) => {
      const near = (target: number) => {
        const level = data.levels.find((candidate) => candidate.position === target)
        return level ? { name: level.name, slug: level.slug, position: level.position } : null
      }
      return { prev: near(position - 1), next: near(position + 1) }
    },

    getPlayers: async (params: playersApi.GetPlayersParams = {}) => {
      const search = normalizeSearch(params.search ?? '').toLowerCase()
      const rows = data.players
        .filter((player) => search === '' || player.name.toLowerCase().includes(search))
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.name.localeCompare(b.name))
      return paged(rows, params.page, params.pageSize)
    },

    getPlayerBySlug: async (slug: string) =>
      data.players.find((player) => player.slug === slug) ?? null,

    getPlayerRecords: async (playerId: string, options: playersApi.PlayerRecordsOptions = {}) =>
      data.completions
        .filter((record) => record.player_id === playerId)
        .sort((a, b) =>
          options.sort === 'date'
            ? (b.date_beaten ?? '').localeCompare(a.date_beaten ?? '') ||
              b.created_at.localeCompare(a.created_at)
            : a.level_position - b.level_position,
        ),

    getRecentChanges: async (params: recentApi.GetRecentChangesParams = {}) => {
      const rows = data.recentChanges.filter(
        (change) => !recentApi.isRecentChangeKind(params.kind) || change.kind === params.kind,
      )
      return paged(rows, params.page, params.pageSize, recentApi.RECENT_CHANGES_PAGE_SIZE)
    },

    getRecentRecords: async (limit: number = recordsApi.DEFAULT_RECENT_RECORDS) =>
      data.recentChanges
        .filter((change): change is RecentRecordChange => change.kind === 'record')
        .slice(0, Math.max(1, Math.trunc(limit))),

    searchSite: async (q: string): Promise<SearchResult[]> => {
      const term = normalizeSearch(q).toLowerCase()
      if (term === '') return []
      const levels: SearchResult[] = data.levels
        .filter((level) => level.name.toLowerCase().includes(term))
        .slice(0, 8)
        .map((level) => ({
          kind: 'level',
          id: level.id,
          name: level.name,
          slug: level.slug,
          position: level.position,
        }))
      const players: SearchResult[] = data.players
        .filter((player) => player.name.toLowerCase().includes(term))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((player) => ({
          kind: 'player',
          id: player.id,
          name: player.name,
          slug: player.slug,
          position: null,
        }))
      return [...levels, ...players]
    },

    getSiteStats: async (): Promise<SiteStats> => {
      const { months, undated } = statsApi.countCompletionsPerMonth(
        data.completions.map((record) => record.date_beaten),
      )
      const top = (value: (level: Level) => number | null) =>
        data.levels
          .filter((level) => value(level) !== null)
          .sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0) || a.position - b.position)
          .slice(0, statsApi.TOP_LEVELS)
      return {
        levels: data.levels.length,
        players: data.players.length,
        records: data.completions.length,
        totalAttempts: data.completions.reduce((sum, record) => sum + (record.attempts ?? 0), 0),
        difficultyDistribution: statsApi.countDifficulties(data.levels.map((l) => l.difficulty)),
        completionsPerMonth: months,
        undatedCompletions: undated,
        mostEnjoyed: top((level) => level.avg_enjoyment),
        mostAttempts: top((level) => level.avg_attempts),
      }
    },
  }
}

/** Every src/api data function mockApiDefaults() controls. */
const API = {
  getSettings: settingsApi.getSettings,
  getLevels: levelsApi.getLevels,
  getLevelBySlug: levelsApi.getLevelBySlug,
  getLevelRecords: levelsApi.getLevelRecords,
  getLevelHistory: levelsApi.getLevelHistory,
  getAdjacentLevels: levelsApi.getAdjacentLevels,
  getPlayers: playersApi.getPlayers,
  getPlayerBySlug: playersApi.getPlayerBySlug,
  getPlayerRecords: playersApi.getPlayerRecords,
  getRecentChanges: recentApi.getRecentChanges,
  getRecentRecords: recordsApi.getRecentRecords,
  searchSite: searchApi.searchSite,
  getSiteStats: statsApi.getSiteStats,
}

/**
 * Makes every src/api data function answer from `data` (TEST_DATA by default) instead of the
 * network, after clearing anything a previous test set on them (calls, mockResolvedValueOnce…).
 * Call it in beforeEach. Filters, sorting and paging behave like the real API (simplified).
 */
export function mockApiDefaults(data: TestData = TEST_DATA): void {
  const impl = answers(data)
  for (const [name, fn] of Object.entries(API)) {
    if (!vi.isMockFunction(fn)) {
      throw new Error(
        `${name} is not mocked. src/test/setup.ts should wrap src/api in spies; if this test ` +
          `file calls vi.mock for that module itself, give it a vi.fn() for ${name}.`,
      )
    }
    fn.mockReset()
    fn.mockImplementation(impl[name as keyof typeof impl] as never)
  }
}
