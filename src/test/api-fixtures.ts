/**
 * Realistic (fake) rows as the database sends them, for the src/api tests.
 * Each builder takes overrides so a test can change just the field it is about.
 */
import type {
  LevelsViewRow,
  PlayersViewRow,
  PositionHistoryRow,
  RecentChangesViewRow,
  RecordsViewRow,
  SearchSiteRow,
} from '../api/mappers'

export const LEVEL_ID = '11111111-1111-4111-8111-111111111111'
export const PLAYER_ID = '22222222-2222-4222-8222-222222222222'
export const RECORD_ID = '33333333-3333-4333-8333-333333333333'
export const HISTORY_ID = '44444444-4444-4444-8444-444444444444'
export const OTHER_LEVEL_ID = '55555555-5555-4555-8555-555555555555'

const CREATED = '2026-10-07T14:02:00.123456+00:00'

export function levelRow(overrides: Partial<LevelsViewRow> = {}): LevelsViewRow {
  return {
    id: LEVEL_ID,
    position: 1,
    name: 'Sample Level 1',
    slug: 'sample-level-1',
    gd_level_id: 1000001,
    creator: 'Sample Creator',
    verifier: null,
    difficulty: 'extreme_demon',
    difficulty_rating: 9.5,
    points_override: null,
    length_seconds: 95,
    showcase_video_url: null,
    thumbnail_path: null,
    description: 'A fake level for tests',
    notes: null,
    created_at: CREATED,
    updated_at: CREATED,
    section: 'main',
    points: 250,
    victor_count: 2,
    avg_enjoyment: 7.5,
    avg_attempts: 12000,
    first_victor_id: PLAYER_ID,
    first_victor_name: 'Player Alpha',
    first_victor_slug: 'player-alpha',
    first_victory_date: '2026-01-05',
    first_victor_video_url: null,
    ...overrides,
  }
}

export function playerRow(overrides: Partial<PlayersViewRow> = {}): PlayersViewRow {
  return {
    id: PLAYER_ID,
    name: 'Player Alpha',
    slug: 'player-alpha',
    country_code: 'US',
    avatar_path: null,
    channel_url: null,
    bio: null,
    created_at: CREATED,
    updated_at: CREATED,
    total_points: 453.63,
    completions: 2,
    hardest_level_id: LEVEL_ID,
    hardest_level_name: 'Sample Level 1',
    hardest_level_slug: 'sample-level-1',
    hardest_level_position: 1,
    first_victories: 1,
    total_attempts: 15000,
    avg_enjoyment: 7.25,
    rank: 1,
    ...overrides,
  }
}

export function recordRow(overrides: Partial<RecordsViewRow> = {}): RecordsViewRow {
  return {
    id: RECORD_ID,
    level_id: LEVEL_ID,
    player_id: PLAYER_ID,
    attempts: 12000,
    enjoyment: 7.5,
    date_beaten: '2026-01-05',
    video_url: null,
    notes: null,
    created_at: CREATED,
    updated_at: CREATED,
    level_name: 'Sample Level 1',
    level_slug: 'sample-level-1',
    level_position: 1,
    level_section: 'main',
    level_points: 250,
    level_difficulty: 'extreme_demon',
    player_name: 'Player Alpha',
    player_slug: 'player-alpha',
    player_country_code: 'US',
    is_first_victory: true,
    ...overrides,
  }
}

export function recentRecordRow(
  overrides: Partial<RecentChangesViewRow> = {},
): RecentChangesViewRow {
  return {
    id: RECORD_ID,
    kind: 'record',
    happened_at: CREATED,
    event_date: '2026-01-05',
    level_id: LEVEL_ID,
    level_name: 'Sample Level 1',
    level_slug: 'sample-level-1',
    player_id: PLAYER_ID,
    player_name: 'Player Alpha',
    player_slug: 'player-alpha',
    old_position: null,
    new_position: null,
    attempts: 12000,
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ...overrides,
  }
}

export function recentLevelRow(
  overrides: Partial<RecentChangesViewRow> = {},
): RecentChangesViewRow {
  return {
    id: HISTORY_ID,
    kind: 'level_moved',
    happened_at: CREATED,
    event_date: '2026-10-07',
    level_id: LEVEL_ID,
    level_name: 'Sample Level 1',
    level_slug: 'sample-level-1',
    player_id: null,
    player_name: null,
    player_slug: null,
    old_position: 4,
    new_position: 1,
    attempts: null,
    video_url: null,
    ...overrides,
  }
}

export function historyRow(overrides: Partial<PositionHistoryRow> = {}): PositionHistoryRow {
  return {
    id: HISTORY_ID,
    level_id: LEVEL_ID,
    old_position: 4,
    new_position: 1,
    reason: 'moved',
    changed_at: CREATED,
    seq: 7,
    ...overrides,
  }
}

export function searchRow(overrides: Partial<SearchSiteRow> = {}): SearchSiteRow {
  return {
    kind: 'level',
    id: LEVEL_ID,
    name: 'Sample Level 1',
    slug: 'sample-level-1',
    position: 1,
    ...overrides,
  }
}

/** A PostgREST error object exactly as supabase-js returns it (a plain object, not an Error). */
export function postgrestError(
  code: string,
  message: string,
  details: string | null = null,
  hint: string | null = null,
) {
  return { code, message, details, hint }
}
