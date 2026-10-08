-- =============================================================================
-- Qwerty Crate · migration 1 of 4 · SCHEMA
--
-- Creates the difficulty enum, the six tables, their checks and indexes, and
-- the shared trigger that keeps "updated_at" current.
-- Security (row level security, policies, grants) is in the next migration.
-- Reference: docs/PLAN.md §3.
-- =============================================================================

-- pgcrypto is already installed on Supabase, in the "extensions" schema. We
-- only make sure it exists; ids use Postgres' built-in gen_random_uuid().
create extension if not exists pgcrypto with schema extensions;

-- In-game difficulty of a level.
do $$
begin
  create type public.gd_difficulty as enum (
    'auto', 'easy', 'normal', 'hard', 'harder', 'insane',
    'easy_demon', 'medium_demon', 'hard_demon', 'insane_demon', 'extreme_demon'
  );
exception
  when duplicate_object then null; -- already exists (file was run twice)
end
$$;

-- -----------------------------------------------------------------------------
-- site_settings: exactly one row (id = 1) with the list sizes and the points
-- formula. Changing these values re-computes sections and points instantly.
-- The list sizes have an upper limit (10000) so a typo can never make
-- "main + extended" too big for an int, which would break every page.
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                 int primary key default 1 check (id = 1),
  site_name          text not null default 'Qwerty Crate' check (btrim(site_name) <> ''),
  main_list_size     int not null default 25
                     check (main_list_size between 1 and 10000),             -- #1..#25 = Main
  extended_list_size int not null default 25
                     check (extended_list_size between 0 and 10000),         -- next 25 = Extended
  points_max         numeric not null default 250 check (points_max > 0),     -- points for #1
  points_decay       numeric not null default 0.95
                     check (points_decay > 0 and points_decay <= 1),          -- x0.95 per position
  points_min         numeric not null default 5,                              -- floor
  updated_at         timestamptz not null default now(),
  constraint site_settings_points_min_check check (points_min >= 0 and points_min <= points_max)
);

-- The singleton row with all the defaults.
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- levels: the ranked list. position 1 = hardest.
-- -----------------------------------------------------------------------------
create table if not exists public.levels (
  id                 uuid primary key default gen_random_uuid(),
  position           int not null check (position > 0),
  name               text not null check (btrim(name) <> ''),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  gd_level_id        bigint unique check (gd_level_id > 0),    -- the in-game level ID
  creator            text,
  verifier           text,
  difficulty         public.gd_difficulty not null default 'extreme_demon',
  difficulty_rating  numeric(5, 2) check (difficulty_rating between 0 and 100), -- our own score
  points_override    numeric check (points_override >= 0),     -- replaces the formula if set
  length_seconds     int check (length_seconds > 0),
  showcase_video_url text check (showcase_video_url ~* '^https?://'),
  thumbnail_path     text,                                      -- path inside the "media" bucket
  description        text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- DEFERRABLE INITIALLY DEFERRED: while the ranking is being reshuffled
  -- inside one transaction two levels may briefly share a position. Postgres
  -- checks that positions are unique only when the transaction commits.
  constraint levels_position_key unique (position) deferrable initially deferred
);

create index if not exists levels_difficulty_idx on public.levels (difficulty);

-- -----------------------------------------------------------------------------
-- players: the friends.
-- -----------------------------------------------------------------------------
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (btrim(name) <> ''),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code text check (country_code ~ '^[A-Z]{2}$'),       -- e.g. 'US', for a flag
  avatar_path  text,                                            -- path inside the "media" bucket
  channel_url  text check (channel_url ~* '^https?://'),
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Names are unique ignoring upper/lower case ("Alpha" and "alpha" clash).
create unique index if not exists players_name_lower_key on public.players (lower(name));

-- -----------------------------------------------------------------------------
-- records: "player X beat level Y". Deleting a level or a player deletes its
-- records too (on delete cascade).
-- -----------------------------------------------------------------------------
create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  attempts    int check (attempts >= 1),
  enjoyment   numeric(3, 1) check (enjoyment between 0 and 10),
  date_beaten date,
  video_url   text check (video_url ~* '^https?://'),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint records_level_player_key unique (level_id, player_id) -- one completion per player per level
);

create index if not exists records_level_id_idx on public.records (level_id);
create index if not exists records_player_id_idx on public.records (player_id);
create index if not exists records_date_beaten_idx on public.records (date_beaten desc nulls last);

-- -----------------------------------------------------------------------------
-- level_position_history: written automatically by the ranking functions
-- (migration 3). reason: 'added' (new level), 'moved' (an admin moved it),
-- 'shifted' (it moved because another level was added/moved/deleted).
-- seq: a counter that only goes up, in the order rows were written. now() is
-- the same for a whole transaction, so if one SQL script changes the ranking
-- twice, two rows of a level can share changed_at; ordering a timeline by
-- (changed_at desc, seq desc) still puts the newest step first.
-- -----------------------------------------------------------------------------
create table if not exists public.level_position_history (
  id           uuid primary key default gen_random_uuid(),
  level_id     uuid not null references public.levels (id) on delete cascade,
  old_position int check (old_position > 0),  -- null for 'added'
  new_position int check (new_position > 0),
  reason       text not null check (reason in ('added', 'moved', 'shifted')),
  changed_at   timestamptz not null default now(),
  seq          bigint generated always as identity
);

create index if not exists level_position_history_level_id_changed_at_idx
  on public.level_position_history (level_id, changed_at desc, seq desc);

-- -----------------------------------------------------------------------------
-- admins: the Supabase Auth users allowed to edit. Filled by hand with one
-- SQL line in the dashboard (Phase 5); nobody can add rows through the API.
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger, shared by levels, players, records and site_settings.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Trigger functions are never called directly, so nobody needs EXECUTE.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create or replace trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create or replace trigger levels_set_updated_at
  before update on public.levels
  for each row execute function public.set_updated_at();

create or replace trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

create or replace trigger records_set_updated_at
  before update on public.records
  for each row execute function public.set_updated_at();
