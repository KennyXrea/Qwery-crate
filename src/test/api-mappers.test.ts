import { describe, expect, expectTypeOf, it } from 'vitest'
import { ApiError, UNEXPECTED_DATA_CODE, UNEXPECTED_DATA_MESSAGE } from '../api/errors'
import {
  toCompletion,
  toLevel,
  toPlayer,
  toPositionHistoryEntry,
  toRecentChange,
  toRecentRecordChange,
  toSearchResult,
} from '../api/mappers'
import { DIFFICULTIES, type GdDifficulty as FormatGdDifficulty } from '../lib/format'
import { levelThumbnail, playerAvatarUrl } from '../lib/media'
import { Constants, type Database } from '../types/database'
import type {
  Completion,
  GdDifficulty,
  Level,
  LevelSection,
  Player,
  PositionHistoryEntry,
  RecentChange,
  SearchResult,
  SiteSettings,
} from '../types/models'
import {
  historyRow,
  levelRow,
  playerRow,
  recentLevelRow,
  recentRecordRow,
  recordRow,
  searchRow,
} from './api-fixtures'

function expectUnexpectedData(fn: () => unknown, column: RegExp) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      kind: 'unknown',
      code: UNEXPECTED_DATA_CODE,
      message: UNEXPECTED_DATA_MESSAGE,
    })
    // The technical detail (which column) is kept for the console, not shown to people.
    expect(String((error as ApiError).cause)).toMatch(column)
    return
  }
  throw new Error('expected the mapper to throw')
}

describe('toLevel', () => {
  it('keeps every column and narrows section / difficulty', () => {
    const row = levelRow({ section: 'legacy', points: 0, difficulty: 'insane' })
    const level = toLevel(row)
    expect(level).toEqual(row)
    expect(level.section).toBe('legacy')
  })

  it('allows null in the columns that may be null', () => {
    const level = toLevel(
      levelRow({
        victor_count: 0,
        avg_enjoyment: null,
        avg_attempts: null,
        first_victor_id: null,
        first_victor_name: null,
        first_victor_slug: null,
        first_victory_date: null,
        first_victor_video_url: null,
        gd_level_id: null,
      }),
    )
    expect(level.first_victor_name).toBeNull()
  })

  it.each([
    'id',
    'position',
    'name',
    'slug',
    'difficulty',
    'created_at',
    'updated_at',
    'section',
    'points',
    'victor_count',
  ] as const)('throws when %s is null', (column) => {
    expectUnexpectedData(() => toLevel(levelRow({ [column]: null })), new RegExp(column))
  })

  it('throws for an unknown section or difficulty', () => {
    expectUnexpectedData(() => toLevel(levelRow({ section: 'bonus' })), /section/)
    expectUnexpectedData(
      () => toLevel(levelRow({ difficulty: 'mythic' as unknown as GdDifficulty })),
      /difficulty/,
    )
  })

  it('works with the src/lib helpers as it is (snake_case fields)', () => {
    const level = toLevel(
      levelRow({ showcase_video_url: 'https://youtu.be/dQw4w9WgXcQ', thumbnail_path: null }),
    )
    expect(levelThumbnail(level, 'https://example.supabase.co')).toMatchObject({
      kind: 'image',
      source: 'youtube',
    })
  })
})

describe('toPlayer', () => {
  it('keeps nullable fields (rank, hardest level, attempts) as null', () => {
    const player = toPlayer(
      playerRow({
        rank: null,
        completions: 0,
        total_points: 0,
        first_victories: 0,
        hardest_level_id: null,
        hardest_level_name: null,
        hardest_level_slug: null,
        hardest_level_position: null,
        total_attempts: 0,
        avg_enjoyment: null,
      }),
    )
    expect(player.rank).toBeNull()
    expect(playerAvatarUrl(player, 'https://example.supabase.co')).toBeNull()
  })

  it.each(['id', 'name', 'slug', 'total_points', 'completions', 'first_victories'] as const)(
    'throws when %s is null',
    (column) => {
      expectUnexpectedData(() => toPlayer(playerRow({ [column]: null })), new RegExp(column))
    },
  )
})

describe('toCompletion', () => {
  it('maps a records_view row', () => {
    expect(toCompletion(recordRow({ date_beaten: null, attempts: null }))).toMatchObject({
      date_beaten: null,
      attempts: null,
      level_section: 'main',
    })
  })

  it.each(['level_name', 'player_slug', 'is_first_victory', 'level_points'] as const)(
    'throws when %s is null',
    (column) => {
      expectUnexpectedData(() => toCompletion(recordRow({ [column]: null })), new RegExp(column))
    },
  )
})

describe('toRecentChange', () => {
  it('maps each kind to its own shape', () => {
    expect(toRecentChange(recentRecordRow())).toMatchObject({
      kind: 'record',
      player_name: 'Player Alpha',
      old_position: null,
      new_position: null,
      attempts: 12000,
    })
    expect(toRecentChange(recentLevelRow())).toMatchObject({
      kind: 'level_moved',
      old_position: 4,
      new_position: 1,
      player_id: null,
    })
    expect(
      toRecentChange(recentLevelRow({ kind: 'level_added', old_position: null, new_position: 7 })),
    ).toMatchObject({ kind: 'level_added', old_position: null, new_position: 7 })
  })

  it('throws for missing required values', () => {
    expectUnexpectedData(() => toRecentChange(recentRecordRow({ kind: null })), /kind/)
    expectUnexpectedData(() => toRecentChange(recentRecordRow({ level_slug: null })), /level_slug/)
    expectUnexpectedData(() => toRecentChange(recentRecordRow({ player_id: null })), /player_id/)
  })
})

describe('toRecentRecordChange', () => {
  it('maps a completion row', () => {
    const change = toRecentRecordChange(recentRecordRow({ attempts: null }))
    expectTypeOf(change.player_slug).toEqualTypeOf<string>()
    expect(change).toMatchObject({ kind: 'record', player_slug: 'player-alpha', attempts: null })
  })

  it('throws for rows that are not completions', () => {
    expectUnexpectedData(() => toRecentRecordChange(recentLevelRow()), /kind/)
  })
})

describe('toPositionHistoryEntry / toSearchResult', () => {
  it('maps history rows and checks the reason', () => {
    expect(toPositionHistoryEntry(historyRow({ reason: 'shifted' })).reason).toBe('shifted')
    expectUnexpectedData(() => toPositionHistoryEntry(historyRow({ reason: '' })), /reason/)
  })

  it('maps search rows into the level / player union', () => {
    expect(toSearchResult(searchRow())).toMatchObject({ kind: 'level', position: 1 })
    expect(
      toSearchResult(searchRow({ kind: 'player', position: null as unknown as number })),
    ).toMatchObject({ kind: 'player', position: null })
  })
})

describe('model types', () => {
  it('the hand-written difficulty list matches the database enum (same values, same order)', () => {
    expect([...DIFFICULTIES]).toEqual([...Constants.public.Enums.gd_difficulty])
    expectTypeOf<GdDifficulty>().toEqualTypeOf<FormatGdDifficulty>()
    expectTypeOf<GdDifficulty>().toEqualTypeOf<Database['public']['Enums']['gd_difficulty']>()
  })

  it('never-null view columns are non-null; optional ones stay nullable', () => {
    expectTypeOf<Level['id']>().toEqualTypeOf<string>()
    expectTypeOf<Level['position']>().toEqualTypeOf<number>()
    expectTypeOf<Level['points']>().toEqualTypeOf<number>()
    expectTypeOf<Level['section']>().toEqualTypeOf<LevelSection>()
    expectTypeOf<Level['difficulty']>().toEqualTypeOf<GdDifficulty>()
    expectTypeOf<Level['avg_enjoyment']>().toEqualTypeOf<number | null>()
    expectTypeOf<Level['first_victor_name']>().toEqualTypeOf<string | null>()

    expectTypeOf<Player['total_points']>().toEqualTypeOf<number>()
    expectTypeOf<Player['rank']>().toEqualTypeOf<number | null>()
    expectTypeOf<Player['total_attempts']>().toEqualTypeOf<number | null>()

    expectTypeOf<Completion['is_first_victory']>().toEqualTypeOf<boolean>()
    expectTypeOf<Completion['level_section']>().toEqualTypeOf<LevelSection>()
    expectTypeOf<Completion['date_beaten']>().toEqualTypeOf<string | null>()

    expectTypeOf<RecentChange['kind']>().toEqualTypeOf<'record' | 'level_added' | 'level_moved'>()
    expectTypeOf<Extract<RecentChange, { kind: 'record' }>['player_name']>().toEqualTypeOf<string>()
    expectTypeOf<
      Extract<RecentChange, { kind: 'level_moved' }>['old_position']
    >().toEqualTypeOf<number>()

    expectTypeOf<PositionHistoryEntry['reason']>().toEqualTypeOf<'added' | 'moved' | 'shifted'>()
    expectTypeOf<SiteSettings['points_decay']>().toEqualTypeOf<number>()
    expectTypeOf<SearchResult['kind']>().toEqualTypeOf<'level' | 'player'>()
    expectTypeOf<Extract<SearchResult, { kind: 'player' }>['position']>().toEqualTypeOf<null>()
  })
})
