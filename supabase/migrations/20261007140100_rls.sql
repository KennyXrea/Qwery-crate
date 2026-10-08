-- =============================================================================
-- Qwerty Crate · migration 2 of 4 · SECURITY (row level security + grants)
--
-- Rules:
--   * Everyone (logged-out visitors = role "anon", logged-in = "authenticated")
--     may READ the list tables.
--   * Only admins (users listed in public.admins) may INSERT/UPDATE/DELETE.
--   * public.admins is never visible to anon; a logged-in user sees only
--     their own row. Nobody can write it through the API.
-- Postgres enforces all of this, so it holds even if someone edits the
-- website's JavaScript. `npm run check:rls` proves it.
--
-- Rule for every FUTURE migration (Supabase's defaults are wide open):
--   * new table:    enable row level security, add policies, then
--                   "revoke all ... from anon, authenticated" and grant only
--                   what is needed;
--   * new function: "revoke execute ... from public, anon, authenticated",
--                   then grant execute only to the roles that need it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): true when the logged-in user is in public.admins.
-- It runs with the caller's own permissions (SECURITY INVOKER): a logged-in
-- user may read their own row of public.admins (policy "own row read" below),
-- so the answer is right without giving the function any extra power.
-- Only logged-in users may call it: every policy that uses it is "to
-- authenticated", and visitors (anon) are never admins.
-- (PLAN §3 said SECURITY DEFINER; that makes the Supabase Security Advisor
-- warn, lints 0028/0029, and it isn't needed.)
-- search_path = '' stops anyone from hijacking the names it uses.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Turn on row level security everywhere. With RLS on and no matching policy,
-- every request is denied.
-- -----------------------------------------------------------------------------
alter table public.site_settings          enable row level security;
alter table public.levels                 enable row level security;
alter table public.players                enable row level security;
alter table public.records                enable row level security;
alter table public.level_position_history enable row level security;
alter table public.admins                 enable row level security;

-- -----------------------------------------------------------------------------
-- Policies: one per action. "(select public.is_admin())" is wrapped in a
-- sub-select so Postgres runs it once per query instead of once per row.
-- -----------------------------------------------------------------------------

-- site_settings
drop policy if exists "public read" on public.site_settings;
create policy "public read" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "admin insert" on public.site_settings;
create policy "admin insert" on public.site_settings
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.site_settings;
create policy "admin update" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.site_settings;
create policy "admin delete" on public.site_settings
  for delete to authenticated using ((select public.is_admin()));

-- levels
drop policy if exists "public read" on public.levels;
create policy "public read" on public.levels
  for select to anon, authenticated using (true);
drop policy if exists "admin insert" on public.levels;
create policy "admin insert" on public.levels
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.levels;
create policy "admin update" on public.levels
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.levels;
create policy "admin delete" on public.levels
  for delete to authenticated using ((select public.is_admin()));

-- players
drop policy if exists "public read" on public.players;
create policy "public read" on public.players
  for select to anon, authenticated using (true);
drop policy if exists "admin insert" on public.players;
create policy "admin insert" on public.players
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.players;
create policy "admin update" on public.players
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.players;
create policy "admin delete" on public.players
  for delete to authenticated using ((select public.is_admin()));

-- records
drop policy if exists "public read" on public.records;
create policy "public read" on public.records
  for select to anon, authenticated using (true);
drop policy if exists "admin insert" on public.records;
create policy "admin insert" on public.records
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.records;
create policy "admin update" on public.records
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.records;
create policy "admin delete" on public.records
  for delete to authenticated using ((select public.is_admin()));

-- level_position_history (normally written by the ranking functions, which
-- run with the admin's own permissions)
drop policy if exists "public read" on public.level_position_history;
create policy "public read" on public.level_position_history
  for select to anon, authenticated using (true);
drop policy if exists "admin insert" on public.level_position_history;
create policy "admin insert" on public.level_position_history
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.level_position_history;
create policy "admin update" on public.level_position_history
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.level_position_history;
create policy "admin delete" on public.level_position_history
  for delete to authenticated using ((select public.is_admin()));

-- admins: a logged-in user may only check their own row. No insert/update/
-- delete policies on purpose: add yourself with SQL in the Supabase dashboard.
drop policy if exists "own row read" on public.admins;
create policy "own row read" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Table privileges. Supabase gives anon/authenticated every privilege on new
-- tables by default (even TRUNCATE), so start from zero and grant exactly
-- what the policies above need. RLS then decides which rows.
-- -----------------------------------------------------------------------------
revoke all on table
  public.site_settings, public.levels, public.players, public.records,
  public.level_position_history, public.admins
  from public, anon, authenticated;

grant select on table
  public.site_settings, public.levels, public.players, public.records,
  public.level_position_history
  to anon, authenticated;

grant insert, update, delete on table
  public.site_settings, public.levels, public.players, public.records,
  public.level_position_history
  to authenticated;

-- Logged-in users need this so is_admin() can find their own row (RLS above
-- still shows each user only their own row).
grant select on table public.admins to authenticated;

-- The counter behind level_position_history.seq: Postgres fills it in by
-- itself, so nobody needs direct access to it.
revoke all on sequence public.level_position_history_seq_seq from public, anon, authenticated;
