-- =============================================================================
-- Qwerty Crate · migration 3 of 4 · FUNCTIONS AND VIEWS
--
--   level_section(), level_points()        sections + points formula
--   records_view, levels_view,
--   players_view, recent_changes_view      read-only views used by the site
--   search_site()                          header search box
--   levels_positions_contiguous trigger    refuses gaps in the ranking
--   admin_create_level(), admin_move_level(),
--   admin_delete_level()                   ranking changes (admins only)
--   levels_close_gaps trigger              renumbers the list after deletes
--
-- Every function uses "set search_path = ''" and full names (public.x) so
-- nobody can trick it into using a different table or function.
-- All views use security_invoker = true, so row level security still applies.
-- Reference: docs/PLAN.md §3.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- level_section(position) -> 'main' | 'extended' | 'legacy'
-- With the default settings: #1-25 main, #26-50 extended, #51+ legacy.
-- -----------------------------------------------------------------------------
create or replace function public.level_section(p_position int)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_position is null or p_position < 1 then null
    when p_position <= cfg.main_size then 'main'
    when p_position <= cfg.main_size + cfg.extended_size then 'extended'
    else 'legacy'
  end
  -- max() over the single settings row. If that row were ever missing, max()
  -- gives null and the defaults (25 / 25) are used instead.
  from (
    select coalesce(max(s.main_list_size), 25)     as main_size,
           coalesce(max(s.extended_list_size), 25) as extended_size
    from public.site_settings s
    where s.id = 1
  ) as cfg;
$$;

-- -----------------------------------------------------------------------------
-- level_points(position) -> points the formula gives that position:
--   legacy                      -> 0
--   otherwise                   -> max(points_min, points_max * points_decay^(position - 1))
-- rounded to 2 decimals. Defaults: #1 = 250.00, #5 = 203.63, #10 = 157.56,
-- #25 = 73.00, #50 = 20.25, #51 = 0. (A level's points_override is applied in
-- the views, not here.) Must match src/lib/points.ts.
-- -----------------------------------------------------------------------------
create or replace function public.level_points(p_position int)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when p_position is null or p_position < 1 then null
    when p_position > cfg.main_size + cfg.extended_size then 0
    else round(greatest(cfg.p_min, cfg.p_max * power(cfg.p_decay, p_position - 1)), 2)
  end
  -- Same "missing row -> defaults" trick as level_section().
  from (
    select coalesce(max(s.main_list_size), 25)     as main_size,
           coalesce(max(s.extended_list_size), 25) as extended_size,
           coalesce(max(s.points_max), 250)        as p_max,
           coalesce(max(s.points_decay), 0.95)     as p_decay,
           coalesce(max(s.points_min), 5)          as p_min
    from public.site_settings s
    where s.id = 1
  ) as cfg;
$$;

revoke execute on function public.level_section(int) from public, anon, authenticated;
revoke execute on function public.level_points(int) from public, anon, authenticated;
grant execute on function public.level_section(int) to anon, authenticated;
grant execute on function public.level_points(int) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- WHY THE VIEWS BELOW DON'T CALL level_section() / level_points():
-- Postgres can't "inline" functions that have "set search_path", so calling
-- them from a view runs them once per row (for records_view: once per record
-- in the whole database, on every request). Instead the views read the
-- settings row ONCE ("cfg") and use the same formula written out inline.
-- !! The formula therefore exists in three places: level_section(),
-- !! level_points(), and the "sec"/points expressions in records_view and
-- !! levels_view. Change them together. (The test harness compares them.)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- records_view: every record with its level and player details.
-- level_points: legacy levels are always worth 0 (even with an override);
--   otherwise the override wins over the formula.
-- is_first_victory: the earliest completion of the level. Order: date_beaten
--   (unknown dates count as later than every known date, so an undated record
--   is first only if no record of that level has a date), then when it was
--   entered (created_at), then id as a final tie-breaker.
--   levels_view and players_view reuse this column.
-- -----------------------------------------------------------------------------
create or replace view public.records_view
with (security_invoker = true)
as
select
  r.id,
  r.level_id,
  r.player_id,
  r.attempts,
  r.enjoyment,
  r.date_beaten,
  r.video_url,
  r.notes,
  r.created_at,
  r.updated_at,
  l.name         as level_name,
  l.slug         as level_slug,
  l.position     as level_position,
  sec.section    as level_section,
  case
    when sec.section = 'legacy' then 0::numeric
    else coalesce(
      l.points_override,
      round(greatest(cfg.p_min, cfg.p_max * power(cfg.p_decay, l.position - 1)), 2)
    )
  end            as level_points,
  l.difficulty   as level_difficulty,
  p.name         as player_name,
  p.slug         as player_slug,
  p.country_code as player_country_code,
  (
    row_number() over (
      partition by r.level_id
      order by r.date_beaten asc nulls last, r.created_at asc, r.id asc
    ) = 1
  )              as is_first_victory
from public.records r
join public.levels l on l.id = r.level_id
join public.players p on p.id = r.player_id
-- The settings, read once (same "missing row -> defaults" trick as above).
cross join (
  select coalesce(max(s.main_list_size), 25)     as main_size,
         coalesce(max(s.extended_list_size), 25) as extended_size,
         coalesce(max(s.points_max), 250)        as p_max,
         coalesce(max(s.points_decay), 0.95)     as p_decay,
         coalesce(max(s.points_min), 5)          as p_min
  from public.site_settings s
  where s.id = 1
) as cfg
-- Same rule as level_section().
cross join lateral (
  select case
    when l.position <= cfg.main_size then 'main'
    when l.position <= cfg.main_size + cfg.extended_size then 'extended'
    else 'legacy'
  end as section
) as sec;

-- -----------------------------------------------------------------------------
-- levels_view: every level plus its section, points and victor statistics.
-- (The thumbnail URL is worked out in the browser, not here: uploaded image,
-- else the YouTube thumbnail of the showcase or first victor's video.)
-- -----------------------------------------------------------------------------
create or replace view public.levels_view
with (security_invoker = true)
as
select
  l.id,
  l.position,
  l.name,
  l.slug,
  l.gd_level_id,
  l.creator,
  l.verifier,
  l.difficulty,
  l.difficulty_rating,
  l.points_override,
  l.length_seconds,
  l.showcase_video_url,
  l.thumbnail_path,
  l.description,
  l.notes,
  l.created_at,
  l.updated_at,
  sec.section,
  case
    when sec.section = 'legacy' then 0::numeric
    else coalesce(
      l.points_override,
      round(greatest(cfg.p_min, cfg.p_max * power(cfg.p_decay, l.position - 1)), 2)
    )
  end                            as points,
  coalesce(st.victor_count, 0)   as victor_count,
  st.avg_enjoyment,
  st.avg_attempts,
  fv.player_id                   as first_victor_id,
  fv.player_name                 as first_victor_name,
  fv.player_slug                 as first_victor_slug,
  fv.date_beaten                 as first_victory_date,
  fv.video_url                   as first_victor_video_url  -- fallback thumbnail source
from public.levels l
-- The settings, read once (see the note above records_view).
cross join (
  select coalesce(max(s.main_list_size), 25)     as main_size,
         coalesce(max(s.extended_list_size), 25) as extended_size,
         coalesce(max(s.points_max), 250)        as p_max,
         coalesce(max(s.points_decay), 0.95)     as p_decay,
         coalesce(max(s.points_min), 5)          as p_min
  from public.site_settings s
  where s.id = 1
) as cfg
-- Same rule as level_section().
cross join lateral (
  select case
    when l.position <= cfg.main_size then 'main'
    when l.position <= cfg.main_size + cfg.extended_size then 'extended'
    else 'legacy'
  end as section
) as sec
left join (
  select
    r.level_id,
    count(*)::int                    as victor_count,
    round(avg(r.enjoyment), 2)       as avg_enjoyment,  -- unknown values are ignored
    round(avg(r.attempts))::int      as avg_attempts
  from public.records r
  group by r.level_id
) as st on st.level_id = l.id
left join public.records_view fv on fv.level_id = l.id and fv.is_first_victory;

-- -----------------------------------------------------------------------------
-- players_view: every player plus score and stats.
-- total_points = sum of the points of every level they beat.
-- total_attempts = sum of the attempts we know; null (unknown) when they
-- have completions but none has an attempt count; 0 with no completions.
-- rank = dense_rank by total_points among players with at least one
-- completion; players with no completions get rank null.
-- -----------------------------------------------------------------------------
create or replace view public.players_view
with (security_invoker = true)
as
with stats as (
  select
    rv.player_id,
    count(*)::int                                     as completions,
    sum(rv.level_points)                              as total_points,
    sum(rv.attempts)                                  as total_attempts, -- known attempts only
    round(avg(rv.enjoyment), 2)                       as avg_enjoyment,
    (count(*) filter (where rv.is_first_victory))::int as first_victories
  from public.records_view rv
  group by rv.player_id
),
hardest as (
  -- the beaten level with the lowest position number = the hardest one
  select distinct on (rv.player_id)
    rv.player_id, rv.level_id, rv.level_name, rv.level_slug, rv.level_position
  from public.records_view rv
  order by rv.player_id, rv.level_position asc
)
select
  p.id,
  p.name,
  p.slug,
  p.country_code,
  p.avatar_path,
  p.channel_url,
  p.bio,
  p.created_at,
  p.updated_at,
  coalesce(s.total_points, 0)    as total_points,
  coalesce(s.completions, 0)     as completions,
  h.level_id                     as hardest_level_id,
  h.level_name                   as hardest_level_name,
  h.level_slug                   as hardest_level_slug,
  h.level_position               as hardest_level_position,
  coalesce(s.first_victories, 0) as first_victories,
  case
    when s.completions >= 1 then s.total_attempts
    else 0
  end                            as total_attempts,
  s.avg_enjoyment,
  case
    when s.completions >= 1 then
      (dense_rank() over (
        partition by (s.completions >= 1)
        order by s.total_points desc
      ))::int
  end                            as rank
from public.players p
left join stats s on s.player_id = p.id
left join hardest h on h.player_id = p.id;

-- -----------------------------------------------------------------------------
-- recent_changes_view: the "Recent changes" feed. New records plus levels
-- that were added or moved by an admin ('shifted' rows are skipped: they are
-- side effects). The site orders it by
--   event_date desc, happened_at desc, kind, id
-- (rows saved in the same transaction share happened_at, so kind and id are
-- needed to make the order, and therefore paging, stable).
--   happened_at: when it was entered on the site
--   event_date:  the day it happened (date beaten for records)
-- -----------------------------------------------------------------------------
create or replace view public.recent_changes_view
with (security_invoker = true)
as
select
  r.id,
  'record'::text                                               as kind,
  r.created_at                                                 as happened_at,
  coalesce(r.date_beaten, (r.created_at at time zone 'UTC')::date) as event_date,
  l.id                                                         as level_id,
  l.name                                                       as level_name,
  l.slug                                                       as level_slug,
  p.id                                                         as player_id,
  p.name                                                       as player_name,
  p.slug                                                       as player_slug,
  null::int                                                    as old_position,
  null::int                                                    as new_position,
  r.attempts,
  r.video_url
from public.records r
join public.levels l on l.id = r.level_id
join public.players p on p.id = r.player_id
union all
select
  h.id,
  case h.reason when 'added' then 'level_added' else 'level_moved' end,
  h.changed_at,
  (h.changed_at at time zone 'UTC')::date,
  l.id,
  l.name,
  l.slug,
  null::uuid,
  null::text,
  null::text,
  h.old_position,
  h.new_position,
  null::int,
  null::text
from public.level_position_history h
join public.levels l on l.id = h.level_id
where h.reason in ('added', 'moved');

-- Views: read-only for everyone (Supabase's defaults would allow more).
revoke all on table
  public.records_view, public.levels_view, public.players_view, public.recent_changes_view
  from public, anon, authenticated;
grant select on table
  public.records_view, public.levels_view, public.players_view, public.recent_changes_view
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- search_site(q): header search. Up to 8 levels (by position) then up to 8
-- players (by name) whose name contains q, ignoring case. q needs 2 to 100
-- characters (after trimming spaces): longer text returns nothing, so nobody
-- can make the database compare huge strings against every name.
-- \, % and _ are escaped so they are searched literally.
-- -----------------------------------------------------------------------------
create or replace function public.search_site(q text)
returns table (kind text, id uuid, name text, slug text, "position" int)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    select '%'
           || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_')
           || '%' as pattern
    where q is not null and length(btrim(q)) between 2 and 100
  ),
  found_levels as (
    select 'level'::text as kind, l.id, l.name, l.slug, l.position
    from public.levels l, term t
    where l.name ilike t.pattern escape '\'
    order by l.position
    limit 8
  ),
  found_players as (
    select 'player'::text as kind, p.id, p.name, p.slug, null::int as position
    from public.players p, term t
    where p.name ilike t.pattern escape '\'
    order by p.name
    limit 8
  ),
  found as (
    select 1 as grp, fl.* from found_levels fl
    union all
    select 2 as grp, fp.* from found_players fp
  )
  select f.kind, f.id, f.name, f.slug, f.position
  from found f
  order by f.grp, f.position, f.name;
$$;

revoke execute on function public.search_site(text) from public, anon, authenticated;
grant execute on function public.search_site(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Safety net: the ranking must always be exactly #1, #2 ... #n, no gaps.
-- The functions below and the delete trigger keep it that way. But a direct
-- edit of "position" (an API update, or a number typed in the Supabase Table
-- Editor) could leave a gap, and the level would then show in the wrong
-- section with the wrong points. This check refuses such a change.
-- It runs when the transaction ends ("deferred"), because while a ranking
-- change is in progress positions are briefly out of order.
-- (Positions are unique and above 0, so "highest position = number of levels"
-- means exactly 1..n.)
-- -----------------------------------------------------------------------------
create or replace function public.levels_check_contiguous()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select coalesce(max(l.position), 0) <> count(*) from public.levels l) then
    raise exception 'level positions must be 1, 2, 3 ... with no gaps'
      using errcode = '23514',
            hint = 'Change positions with admin_create_level / admin_move_level instead of editing position directly.';
  end if;
  return null;
end;
$$;

revoke execute on function public.levels_check_contiguous() from public, anon, authenticated;

-- (CREATE OR REPLACE does not work for constraint triggers, hence drop + create.)
drop trigger if exists levels_positions_contiguous on public.levels;
create constraint trigger levels_positions_contiguous
  after insert or update of position on public.levels
  deferrable initially deferred
  for each row
  execute function public.levels_check_contiguous();

-- -----------------------------------------------------------------------------
-- admin_create_level(...): adds a level at a position, pushing the levels at
-- that position and below down by one, and writes the position history.
--   p_position null -> added at the end of the list
--   p_position < 1  -> #1;  p_position > count + 1 -> end of the list
-- Returns the new level row.
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_level(
  p_name               text,
  p_slug               text,
  p_position           int default null,
  p_gd_level_id        bigint default null,
  p_creator            text default null,
  p_verifier           text default null,
  p_difficulty         public.gd_difficulty default 'extreme_demon',
  p_difficulty_rating  numeric default null,
  p_points_override    numeric default null,
  p_length_seconds     int default null,
  p_showcase_video_url text default null,
  p_thumbnail_path     text default null,
  p_description        text default null,
  p_notes              text default null
)
returns public.levels
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count    int;
  v_position int;
  v_level    public.levels;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Only one ranking change at a time (others wait for this one to finish).
  lock table public.levels in share row exclusive mode;

  -- While we shuffle, two levels may briefly share a position (or leave a
  -- gap). Check "unique" and "no gaps" at the end of the transaction, even if
  -- the caller asked for immediate checks.
  set constraints public.levels_position_key, public.levels_positions_contiguous deferred;

  select count(*) into v_count from public.levels;
  v_position := least(greatest(coalesce(p_position, v_count + 1), 1), v_count + 1);

  -- Make room: everything at v_position or below moves down one place.
  with shifted as (
    update public.levels
    set position = position + 1
    where position >= v_position
    returning id, position
  )
  insert into public.level_position_history (level_id, old_position, new_position, reason)
  select s.id, s.position - 1, s.position, 'shifted' from shifted s;

  insert into public.levels (
    position, name, slug, gd_level_id, creator, verifier, difficulty,
    difficulty_rating, points_override, length_seconds, showcase_video_url,
    thumbnail_path, description, notes
  ) values (
    v_position, p_name, p_slug, p_gd_level_id, p_creator, p_verifier, p_difficulty,
    p_difficulty_rating, p_points_override, p_length_seconds, p_showcase_video_url,
    p_thumbnail_path, p_description, p_notes
  )
  returning * into v_level;

  insert into public.level_position_history (level_id, old_position, new_position, reason)
  values (v_level.id, null, v_position, 'added');

  return v_level;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_move_level(level, new position): moves one level and shifts the
-- levels in between by one place, writing the position history.
--   new position < 1 -> #1;  > count -> last place;  null -> error
--   moving to the position it already has does nothing (no history).
-- Returns the moved level row.
-- -----------------------------------------------------------------------------
create or replace function public.admin_move_level(p_level_id uuid, p_new_position int)
returns public.levels
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old   int;
  v_new   int;
  v_count int;
  v_delta int;
  v_level public.levels;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_level_id is null or p_new_position is null then
    raise exception 'level id and new position are required' using errcode = '22004';
  end if;

  -- Only one ranking change at a time (others wait for this one to finish).
  lock table public.levels in share row exclusive mode;

  -- While we shuffle, two levels may briefly share a position (or leave a
  -- gap). Check "unique" and "no gaps" at the end of the transaction, even if
  -- the caller asked for immediate checks.
  set constraints public.levels_position_key, public.levels_positions_contiguous deferred;

  select l.position into v_old from public.levels l where l.id = p_level_id;
  if not found then
    raise exception 'level not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count from public.levels;
  v_new := least(greatest(p_new_position, 1), v_count);

  if v_new = v_old then
    select * into v_level from public.levels l where l.id = p_level_id;
    return v_level;
  end if;

  -- Moving up (to a smaller number): the levels in between go down (+1).
  -- Moving down (to a bigger number): the levels in between go up (-1).
  v_delta := case when v_new < v_old then 1 else -1 end;

  with shifted as (
    update public.levels
    set position = position + v_delta
    where id <> p_level_id
      and position between least(v_old, v_new) and greatest(v_old, v_new)
    returning id, position
  )
  insert into public.level_position_history (level_id, old_position, new_position, reason)
  select s.id, s.position - v_delta, s.position, 'shifted' from shifted s;

  update public.levels l
  set position = v_new
  where l.id = p_level_id
  returning * into v_level;

  insert into public.level_position_history (level_id, old_position, new_position, reason)
  values (p_level_id, v_old, v_new, 'moved');

  return v_level;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_delete_level(level): deletes one level (its records and position
-- history go with it); the levels_close_gaps trigger below then closes the
-- gap. The admin dashboard should use this instead of a plain DELETE: it
-- takes the ranking lock BEFORE deleting, so two deletes (or a delete and an
-- edit) at the same moment simply wait for each other. A plain DELETE only
-- gets that lock afterwards, inside the trigger, and two of them at once can
-- end in a "deadlock detected" error.
-- Returns true if the level was deleted, false if it didn't exist (anymore).
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_level(p_level_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Only one ranking change at a time (others wait for this one to finish).
  lock table public.levels in share row exclusive mode;

  delete from public.levels l where l.id = p_level_id;
  return found;
end;
$$;

revoke execute on function public.admin_create_level from public, anon, authenticated;
revoke execute on function public.admin_move_level(uuid, int) from public, anon, authenticated;
revoke execute on function public.admin_delete_level(uuid) from public, anon, authenticated;
grant execute on function public.admin_create_level to authenticated;
grant execute on function public.admin_move_level(uuid, int) to authenticated;
grant execute on function public.admin_delete_level(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- After levels are deleted, close the gaps: renumber the remaining levels
-- 1, 2, 3 ... in their current order, and write one 'shifted' history row for
-- each level whose position changed. It runs once per DELETE statement (not
-- once per row), so deleting several levels at once also works. The deleted
-- levels' own history is removed by "on delete cascade".
-- -----------------------------------------------------------------------------
create or replace function public.levels_close_gaps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A DELETE that matched no rows still fires this trigger: nothing to do.
  if not exists (select 1 from deleted_rows) then
    return null;
  end if;

  -- Only one ranking change at a time.
  lock table public.levels in share row exclusive mode;

  with renumbered as (
    select l.id, l.position as old_position,
           (row_number() over (order by l.position, l.id))::int as new_position
    from public.levels l
  ),
  changed as (
    update public.levels l
    set position = rn.new_position
    from renumbered rn
    where l.id = rn.id
      and l.position <> rn.new_position
    returning l.id, rn.old_position, rn.new_position
  )
  insert into public.level_position_history (level_id, old_position, new_position, reason)
  select c.id, c.old_position, c.new_position, 'shifted' from changed c;

  return null;
end;
$$;

revoke execute on function public.levels_close_gaps() from public, anon, authenticated;

create or replace trigger levels_close_gaps
  after delete on public.levels
  referencing old table as deleted_rows
  for each statement
  execute function public.levels_close_gaps();
