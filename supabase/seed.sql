-- =============================================================================
-- Qwerty Crate · FAKE SAMPLE DATA (for development only)
--
-- Everything here is made up: "Sample Level N", "Player Alpha" ... It exists
-- only so the pages have something to show while we build the site.
-- Remove it with supabase/seed_cleanup.sql (deletes only these rows).
--
-- * Meant for an EMPTY list: the sample levels take positions #1-#12.
-- * Safe to run twice: rows that already exist are skipped.
-- * Runs as the database owner, so row level security does not apply and
--   positions are written directly.
-- * gd_level_id values (999000001 ...) are fake, far above any real level ID.
-- =============================================================================

-- Levels: #1 is the hardest. A mix of difficulties (every demon tier plus two
-- non-demons), some without a GD ID, and one points override (#6).
-- created_at = when the level was added (the same moment as its 'added'
-- history row below), so "newest" sorting and level pages make sense.
insert into public.levels (
  position, name, slug, gd_level_id, creator, verifier, difficulty,
  difficulty_rating, points_override, length_seconds, description, created_at, updated_at
)
select v.position, v.name, v.slug, v.gd_level_id, v.creator, v.verifier, v.difficulty::public.gd_difficulty,
       v.difficulty_rating, v.points_override, v.length_seconds, v.description, v.created_at, v.created_at
from (
  values
    ( 1, 'Sample Level 1',  'sample-level-1',  999000001, 'Sample Creator A',        'Sample Verifier X', 'extreme_demon', 9.50, null,   142, 'Fake sample level for testing.', timestamptz '2026-08-15 17:00:00+00'),
    ( 2, 'Sample Level 2',  'sample-level-2',  999000002, 'Sample Creator B',        null,                'extreme_demon', 9.10, null,   118, 'Fake sample level for testing.', timestamptz '2026-05-03 18:00:00+00'),
    ( 3, 'Sample Level 3',  'sample-level-3',  null,      'Sample Creator C & more', 'Sample Verifier Y', 'extreme_demon', 8.75, null,    95, 'Fake sample level nobody here has beaten yet.', timestamptz '2026-07-10 20:30:00+00'),
    ( 4, 'Sample Level 4',  'sample-level-4',  999000004, 'Sample Creator A',        null,                'insane_demon',  8.20, null,   130, null, timestamptz '2026-02-12 21:00:00+00'),
    ( 5, 'Sample Level 5',  'sample-level-5',  999000005, 'Sample Creator D',        null,                'insane_demon',  7.90, null,    88, 'Fake sample level for testing.', timestamptz '2025-11-04 19:15:00+00'),
    ( 6, 'Sample Level 6',  'sample-level-6',  null,      'Sample Creator B',        null,                'hard_demon',    7.25, 200.00, 101, 'Fake sample level with a points override.', timestamptz '2025-10-11 18:30:00+00'),
    ( 7, 'Sample Level 7',  'sample-level-7',  999000007, 'Sample Creator E',        null,                'hard_demon',    6.80, null,    76, null, timestamptz '2025-07-05 16:00:00+00'),
    ( 8, 'Sample Level 8',  'sample-level-8',  999000008, 'Sample Creator C',        null,                'medium_demon',  6.10, null,    84, 'Fake sample level for testing.', timestamptz '2025-06-13 19:00:00+00'),
    ( 9, 'Sample Level 9',  'sample-level-9',  null,      'Sample Creator F',        null,                'medium_demon',  5.00, null,    69, null, timestamptz '2025-03-23 12:05:00+00'),
    (10, 'Sample Level 10', 'sample-level-10', 999000010, 'Sample Creator D',        null,                'easy_demon',    4.40, null,    92, 'Fake sample level for testing.', timestamptz '2025-02-09 17:30:00+00'),
    (11, 'Sample Level 11', 'sample-level-11', 999000011, 'Sample Creator E',        null,                'insane',        3.20, null,    61, null, timestamptz '2025-01-16 18:00:00+00'),
    (12, 'Sample Level 12', 'sample-level-12', 999000012, 'Sample Creator F',        null,                'harder',        2.50, null,    57, 'Fake sample level for testing.', timestamptz '2025-01-05 12:05:00+00')
) as v (
  position, name, slug, gd_level_id, creator, verifier, difficulty,
  difficulty_rating, points_override, length_seconds, description, created_at
)
on conflict (slug) do nothing;

-- Players. Player Foxtrot has no completions on purpose (tests "no rank").
-- created_at varies (each one joined before their first record).
insert into public.players (name, slug, country_code, channel_url, bio, created_at, updated_at)
select v.name, v.slug, v.country_code, v.channel_url, v.bio, v.created_at, v.created_at
from (
  values
    ('Player Alpha',   'player-alpha',   'US', null,                               'Sample player, not a real person.',     timestamptz '2025-01-02 18:00:00+00'),
    ('Player Bravo',   'player-bravo',   'MX', 'https://example.com/player-bravo', 'Sample player, not a real person.',     timestamptz '2025-01-01 15:30:00+00'),
    ('Player Charlie', 'player-charlie', null, null,                               null,                                    timestamptz '2025-01-08 20:10:00+00'),
    ('Player Delta',   'player-delta',   'ES', null,                               'Sample player, not a real person.',     timestamptz '2025-02-01 12:45:00+00'),
    ('Player Echo',    'player-echo',    null, null,                               null,                                    timestamptz '2025-01-12 09:20:00+00'),
    ('Player Foxtrot', 'player-foxtrot', null, null,                               'Sample player with no completions yet.', timestamptz '2026-09-01 16:00:00+00')
) as v (name, slug, country_code, channel_url, bio, created_at)
on conflict do nothing;

-- Records (who beat what). Some attempts / enjoyment / dates are unknown
-- (null). Sample Level 3 has no victors. On Sample Level 9, Alpha and Bravo
-- share a date; Bravo was entered first, so Bravo is the first victor.
insert into public.records (
  level_id, player_id, attempts, enjoyment, date_beaten, video_url, notes, created_at, updated_at
)
select l.id, p.id, v.attempts, v.enjoyment, v.date_beaten, v.video_url, v.notes, v.created_at, v.created_at
from (
  values
    ('sample-level-1',  'player-alpha',   58231, 9.5,  date '2026-08-14', 'https://example.com/sample-video', 'Sample note.', timestamptz '2026-08-14 21:10:00+00'),
    ('sample-level-2',  'player-alpha',   41200, 8.0,  date '2026-05-02', null, null,           timestamptz '2026-05-02 19:45:00+00'),
    ('sample-level-2',  'player-bravo',   59876, 7.5,  date '2026-09-20', null, null,           timestamptz '2026-09-21 02:05:00+00'),
    ('sample-level-4',  'player-alpha',   23110, null, date '2026-02-11', null, null,           timestamptz '2026-02-11 23:30:00+00'),
    ('sample-level-4',  'player-charlie', 30542, 6.5,  date '2026-03-29', null, null,           timestamptz '2026-03-29 18:00:00+00'),
    ('sample-level-4',  'player-delta',   null,  7.0,  null,              null, 'Date unknown.', timestamptz '2026-04-02 16:20:00+00'),
    ('sample-level-5',  'player-alpha',   15020, 9.0,  date '2025-11-03', null, null,           timestamptz '2025-11-03 20:00:00+00'),
    ('sample-level-5',  'player-bravo',   18004, 8.5,  date '2025-12-24', null, null,           timestamptz '2025-12-26 11:15:00+00'),
    ('sample-level-6',  'player-charlie', 12345, 5.5,  date '2025-10-10', null, null,           timestamptz '2025-10-10 22:40:00+00'),
    ('sample-level-6',  'player-delta',   9876,  6.0,  date '2026-01-17', null, null,           timestamptz '2026-01-17 17:05:00+00'),
    ('sample-level-6',  'player-echo',    14002, null, date '2026-06-30', null, null,           timestamptz '2026-07-01 09:00:00+00'),
    ('sample-level-7',  'player-alpha',   7450,  7.0,  date '2025-07-04', null, null,           timestamptz '2025-07-04 23:59:00+00'),
    ('sample-level-7',  'player-bravo',   6120,  8.0,  date '2025-08-19', null, null,           timestamptz '2025-08-19 20:30:00+00'),
    ('sample-level-7',  'player-echo',    8890,  4.5,  date '2025-09-01', null, null,           timestamptz '2025-09-01 15:10:00+00'),
    ('sample-level-8',  'player-charlie', 4210,  6.0,  date '2025-06-12', null, null,           timestamptz '2025-06-12 21:00:00+00'),
    ('sample-level-8',  'player-delta',   3999,  null, null,              null, null,           timestamptz '2025-06-20 13:30:00+00'),
    ('sample-level-9',  'player-bravo',   1875,  5.0,  date '2025-03-22', null, null,           timestamptz '2025-03-22 20:00:00+00'),
    ('sample-level-9',  'player-alpha',   2100,  3.0,  date '2025-03-22', null, null,           timestamptz '2025-03-22 22:30:00+00'),
    ('sample-level-9',  'player-echo',    2654,  6.5,  date '2025-05-15', null, null,           timestamptz '2025-05-15 19:25:00+00'),
    ('sample-level-10', 'player-delta',   980,   7.5,  date '2025-02-08', null, null,           timestamptz '2025-02-08 18:45:00+00'),
    ('sample-level-10', 'player-charlie', 1203,  8.0,  date '2025-02-28', null, null,           timestamptz '2025-03-01 10:00:00+00'),
    ('sample-level-11', 'player-alpha',   312,   4.0,  date '2025-01-15', null, null,           timestamptz '2025-01-15 20:20:00+00'),
    ('sample-level-11', 'player-echo',    455,   0,    date '2025-01-20', null, null,           timestamptz '2025-01-20 21:00:00+00'),
    ('sample-level-12', 'player-bravo',   1,     10,   date '2025-01-03', null, 'First try!',   timestamptz '2025-01-05 12:00:00+00'),
    ('sample-level-12', 'player-charlie', 37,    9.5,  date '2025-01-09', null, null,           timestamptz '2025-01-09 16:40:00+00'),
    ('sample-level-12', 'player-delta',   null,  null, date '2026-10-01', null, null,           timestamptz '2026-10-01 20:15:00+00')
) as v (level_slug, player_slug, attempts, enjoyment, date_beaten, video_url, notes, created_at)
join public.levels l on l.slug = v.level_slug
join public.players p on p.slug = v.player_slug
on conflict (level_id, player_id) do nothing;

-- Position history, so level timelines and "Recent changes" are not empty.
-- One 'added' row per level, plus three levels an admin later 'moved'.
insert into public.level_position_history (level_id, old_position, new_position, reason, changed_at)
select l.id, v.old_position, v.new_position, v.reason, v.changed_at
from (
  values
    ('sample-level-12', null, 12, 'added', timestamptz '2025-01-05 12:05:00+00'),
    ('sample-level-11', null, 11, 'added', timestamptz '2025-01-16 18:00:00+00'),
    ('sample-level-10', null,  9, 'added', timestamptz '2025-02-09 17:30:00+00'),
    ('sample-level-10',    9, 10, 'moved', timestamptz '2025-03-23 12:00:00+00'),
    ('sample-level-9',  null,  9, 'added', timestamptz '2025-03-23 12:05:00+00'),
    ('sample-level-8',  null,  8, 'added', timestamptz '2025-06-13 19:00:00+00'),
    ('sample-level-7',  null,  9, 'added', timestamptz '2025-07-05 16:00:00+00'),
    ('sample-level-7',     9,  7, 'moved', timestamptz '2025-09-02 20:00:00+00'),
    ('sample-level-6',  null,  6, 'added', timestamptz '2025-10-11 18:30:00+00'),
    ('sample-level-5',  null,  5, 'added', timestamptz '2025-11-04 19:15:00+00'),
    ('sample-level-4',  null,  6, 'added', timestamptz '2026-02-12 21:00:00+00'),
    ('sample-level-4',     6,  4, 'moved', timestamptz '2026-03-30 17:45:00+00'),
    ('sample-level-2',  null,  2, 'added', timestamptz '2026-05-03 18:00:00+00'),
    ('sample-level-3',  null,  3, 'added', timestamptz '2026-07-10 20:30:00+00'),
    ('sample-level-1',  null,  1, 'added', timestamptz '2026-08-15 17:00:00+00')
) as v (level_slug, old_position, new_position, reason, changed_at)
join public.levels l on l.slug = v.level_slug
where not exists (
  select 1
  from public.level_position_history h
  where h.level_id = l.id
    and h.reason = v.reason
    and h.changed_at = v.changed_at
);
