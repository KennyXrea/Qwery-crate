# Claude Code Build Prompt — Qwerty Crate

> **How to use:** keep this file at `docs/BUILD_PROMPT.md` and `PLAN.md` at `docs/PLAN.md`. Open a terminal in the `Qwerty Crate` folder, run `claude`, and send:
> *"Read docs/BUILD_PROMPT.md and docs/PLAN.md fully. Then do Stage 1 (Phases 0 to 5) and stop at the Stage 1 checkpoint."*
> After each stage checkpoint, check the result yourself and say *"Checkpoint passed, continue to Stage N."* If you start a new Claude Code session, say *"Read docs/BUILD_PROMPT.md, docs/PLAN.md and docs/PROGRESS.md, then continue from where PROGRESS.md says we are."*

---

## ROLE AND GOAL

You are building **Qwerty Crate**, a real, working, production-deployed Geometry Dash friend-group list website. `docs/PLAN.md` is the architecture source of truth; read it before writing any code. If this prompt and the plan disagree, follow the plan and tell me about the disagreement.

You must **actually implement** the project: create files, run commands, fix errors. Don't just describe what to do. Mockups, placeholder pages or "TODO: implement" stubs don't count as done.

## HARD RULES

1. **Work incrementally, one STAGE at a time.** To go faster, the phases are grouped into 2 big stages (see the table below). Do the phases of a stage back to back **without stopping between them**, but still do everything below at the end of **each phase**, and only STOP at the end of a stage:
   - run every verification command listed for that phase and fix all failures;
   - update `docs/PROGRESS.md` (phase done, what was built, known issues, next step);
   - make a git commit: `git add -A && git commit -m "Phase N: <summary>"`;
   - at the end of a **stage** only: **STOP** and print a short checkpoint report: what you built, the commands you ran and their results, and anything I must check or do by hand. Then wait for me to say "continue". Between phases inside a stage, just keep going. The exception is a `[MANUAL]` step, where you wait for me to confirm before continuing.
   - If a phase's verification fails and you can't fix it after a few honest attempts, STOP early and explain the problem in plain words instead of pushing on.
2. **Steps marked `[MANUAL]` are mine.** Give me exact numbered click-by-click instructions (which dashboard, which menu, what to copy where) and wait until I confirm. Never pretend a manual step happened. Never ask me to paste a secret key into the chat; I'll put keys in `.env.local` myself.
3. **Never put the Supabase secret / service_role key** in source code, in any `VITE_` variable, in Netlify, or in git. The frontend only ever uses the **publishable key** (called the *anon* key on older projects).
4. **Security lives in Postgres RLS**, not in frontend checks. Frontend route guards are only for the user experience.
5. **Don't use or scrape Pointercrate's API, assets, logos, colors or code.** The screenshots in `docs/reference/` are for layout ideas only. Don't use RobTop's game images (difficulty faces, etc.); draw your own badges with CSS or SVG.
6. **Don't invent real-world data.** Seed data must be clearly fake ("Sample Level 1", "Player Alpha").
7. Keep it simple: no extra libraries beyond the stack below unless you explain why and I agree. No Next.js, no Redux, no CSS-in-JS, no component kit.
8. Avoid huge untested batches. Inside a phase, build in small steps and run `npm run typecheck` / `npm run build` often.
9. TypeScript `strict` mode. No `any` unless commented why. No `dangerouslySetInnerHTML`.
10. If a command or API behaves differently from what this prompt expects (tool versions change), check the current official docs or `--help` output, adapt, and mention it in the checkpoint report.

## STACK

Vite + React + TypeScript · React Router v7 (library/data mode via `createBrowserRouter`, **not** framework mode) · Tailwind CSS v4 via `@tailwindcss/vite` · `@supabase/supabase-js` v2 · `@tanstack/react-query` · `zod` · Vitest · Supabase CLI (as dev dependency, run with `npx supabase`) · `tsx` (to run scripts). Fonts from Google Fonts: Space Grotesk, Inter, JetBrains Mono.

## STAGES (what to do together)

| Stage | Phases | Stops at |
|---|---|---|
| **1** | 0 Prerequisites, 1 Scaffold/theme/layout, 2 Database, 3 Data layer, 4 Public site, 5 Auth + admin dashboard | Stage 1 checkpoint (after Phase 5) |
| **2** | 6 Polish/hardening, 7 Deploy | Final checkpoint |

Don't skip any phase's work or verification when combining. Only the stops between phases are removed. Because Stage 1 is long:
- After finishing each phase, send me **one short plain-language progress line** ("Phase 3 done: data layer works, 14 tests pass") and keep going. This is not a stop.
- Keep `docs/PROGRESS.md` accurate after every phase, so that if the session is cut off or I start a new one, you can resume exactly where you left off.
- You **must** pause for me at `[MANUAL]` steps. The big ones in Stage 1 are: finishing the Supabase project + `.env.local` (before Phase 2), applying migrations (Phase 2), and creating my admin user (Phase 5). **Before starting Phase 2, check that `.env.local` exists with real values (not placeholders); if not, stop and walk me through manual steps B and C first.**

---

## PHASE 0 — Prerequisites, accounts and repo

**You do:**
1. Check the tools: `node -v` (needs ≥ 20; recommend current LTS), `npm -v`, `git --version`. If Node is missing or old, tell me how to install it (recommend nvm or the nodejs.org installer for macOS) and stop.
2. The folder already contains screenshots. Move them into `docs/reference/` and move `PLAN.md` and `BUILD_PROMPT.md` into `docs/` if they aren't there yet.
3. `git init`, set the default branch to `main`, and create `.gitignore` (node_modules, dist, `.env*` except `.env.example`, `.DS_Store`, `docs/reference/`, `supabase/.temp`, `supabase/.branches`).
4. Create `docs/PROGRESS.md`.

**[MANUAL] — tell me to do these, with exact steps:**
- A. Create a **GitHub** account if needed, plus an empty **private** repo named `qwerty-crate` (no README). Give me the `git remote add origin …` + `git push -u origin main` commands for later.
- B. Create a **Supabase** account → New project: name `qwerty-crate`, a strong **database password saved in my password manager**, region closest to the friend group. Wait for it to finish provisioning.
- C. From Supabase → Project Settings → API keys (or "Data API"): copy the **Project URL** and the **Publishable key** (`sb_publishable_…`; on older projects the **anon public** key). Also note the **Project ref** (the ID in the URL). **Do not copy the secret / service_role key anywhere.**
- D. Create a **Netlify** account (sign in with GitHub). Don't create a site yet.

**End of Phase 0:** note the tool versions and files moved in `docs/PROGRESS.md`, commit, and **continue straight into Phase 1**. (Manual steps A–D can be done by me while you build Phase 1; they're needed before Phase 2.)

---

## PHASE 1 — Scaffold, theme, layout shell

1. Scaffold Vite React-TS **in the current folder** (it's not empty; scaffold into a temp dir and move the files in, or use the option that keeps existing files, without deleting `docs/`). Package name `qwerty-crate`.
2. Install: `react-router @supabase/supabase-js @tanstack/react-query zod` and dev deps `tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom supabase tsx prettier`.
3. Scripts in `package.json`: `dev`, `build` (`tsc -b && vite build`), `preview`, `typecheck` (`tsc -b --noEmit` or equivalent), `lint`, `test` (`vitest run`), `test:watch`, `check:rls` (`tsx scripts/check-rls.ts`), `db:types` (`supabase gen types typescript --project-id $SUPABASE_PROJECT_REF --schema public > src/types/database.ts`, made cross-platform; reading the ref from `.env.local` is fine).
4. Add `.nvmrc`, `.prettierrc`, `.env.example`:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   SUPABASE_PROJECT_REF=YOUR-PROJECT-REF
   ```
   **[MANUAL]**: I copy it to `.env.local` and fill in the real values.
5. `src/lib/env.ts`: validate the env vars with zod. If invalid, `main.tsx` renders a friendly full-page "Configuration error: missing VITE_SUPABASE_URL…" instead of crashing.
6. **Theme** in `src/styles/index.css` using Tailwind v4 `@theme` tokens, exactly as in PLAN §13: bg `#0a0e17`, surface `#111826`, surface-2 `#182133`, border `#243049`, text `#f4f7fd` (white), muted `#8d99b3`, accent blue `#4f8cff` (links, rings, highlights), accent-strong blue `#2f6fed` (filled buttons with white text, to keep contrast ≥ 4.5:1), accent-soft `#7aa8ff` (hover), gold `#f5c542`, silver `#c0c7d4`, bronze `#d08a4a`, danger `#ff5d6c`, success `#3ddc97`. Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (mono). The look is **blue + white on near-black navy**. Add a subtle background: a soft blue radial glow at the top of the page plus a very faint dot grid (CSS only, low contrast, not distracting). Do **not** use a pattern of blue squares, which is too close to Pointercrate. Visible `:focus-visible` rings. Respect `prefers-reduced-motion`.
7. **UI primitives** in `src/components/ui/`: `Button` (primary/secondary/ghost/danger, sizes, loading state), `Card`, `RankNumber` (the rank shown as a **plain bold number** like `#1`, in the display font; gold/silver/bronze colors for 1–3, white for the rest; sizes sm/md/lg), `Badge`, `Input`, `Textarea`, `Select`, `Modal` (focus-trapped, Esc closes), `Toast` system (context + `useToast`), `Skeleton`, `Spinner`, `Pagination`, `EmptyState`, `ErrorState` (message + Retry button).
8. **Layout**: `Header` (logo wordmark "QWERTY CRATE" with a simple blue "QC" monogram square (draw it as inline SVG); nav, in this order: **List, Players, Stats, Recent changes, About**; a search button that opens a search modal later), mobile hamburger menu, `Footer` (made-for-our-friend-group line + "Not affiliated with RobTop Games or Pointercrate"), `PageShell` with an optional right `Sidebar` slot (collapses below the content on mobile).
9. **Router** (`src/router.tsx`): `/`, `/list`, `/level/:slug`, `/players`, `/player/:slug`, `/stats`, `/recent`, `/about`, `/admin/login`, `/admin/*` (lazy-loaded), `*` → NotFound. Each page is a styled placeholder for now, except NotFound, which is finished.
10. Add a minimal `CLAUDE.md` at the root summarizing: stack, folder structure (PLAN §10), "all DB access through `src/api`", "never the secret key", "verify with typecheck/lint/test/build before committing", and "update docs/PROGRESS.md each phase".
11. `netlify.toml` now (so routing works from the first deploy):
    ```toml
    [build]
      command = "npm run build"
      publish = "dist"
    [build.environment]
      NODE_VERSION = "22"
    [[redirects]]
      from = "/*"
      to = "/index.html"
      status = 200
    ```
    (Security headers come in Phase 6.)

**Verify:** `npm run typecheck`, `npm run lint`, `npm run build` all pass. Run `npm run dev`, tell me to open `http://localhost:5173`, and list what I should see on desktop and on a phone-width window (DevTools device mode).

**End of Phase 1:** commit, send the progress line, and **continue into Phase 2** (after the `.env.local` check described in the STAGES section). Netlify and GitHub pushing can wait until Phase 7.

---

## PHASE 2 — Database: schema, RLS, functions, views, storage, seed

Write SQL migrations in `supabase/migrations/` with timestamped names (via `npx supabase migration new <name>`). Follow PLAN §3 exactly. Requirements:

**2.1 Schema (`…_schema.sql`)**
- `create extension if not exists pgcrypto;` (for `gen_random_uuid` if needed).
- Enum `public.gd_difficulty` with: `auto, easy, normal, hard, harder, insane, easy_demon, medium_demon, hard_demon, insane_demon, extreme_demon`.
- Tables `site_settings` (singleton, `check (id = 1)`, insert the default row), `levels`, `players`, `records`, `level_position_history`, `admins`, with all columns, defaults, `check` constraints (position > 0, attempts ≥ 1, enjoyment between 0 and 10, difficulty_rating between 0 and 100, URL columns `~* '^https?://'` when not null, slug format `^[a-z0-9]+(-[a-z0-9]+)*$`, `country_code ~ '^[A-Z]{2}$'`).
- `levels.position`: `unique … deferrable initially deferred`.
- Case-insensitive unique index on `lower(players.name)`.
- `unique (level_id, player_id)` on records. FKs `on delete cascade`.
- Indexes: `records(level_id)`, `records(player_id)`, `records(date_beaten desc)`, `levels(difficulty)`, `level_position_history(level_id, changed_at desc)`.
- A shared `set_updated_at()` trigger function and triggers on levels, players, records, site_settings.

**2.2 Security (`…_rls.sql`)**
- `public.is_admin()`: `language sql stable security definer set search_path = ''`, returns `exists (select 1 from public.admins where user_id = auth.uid())`. `grant execute … to anon, authenticated` (it just returns false for anon).
- `alter table … enable row level security` on **every** table.
- For `site_settings, levels, players, records, level_position_history`: policy `"public read"` for `select` to `anon, authenticated` using `(true)`; and **separate** `insert`, `update` and `delete` policies to `authenticated` using/with check `(public.is_admin())`.
- `admins`: **no** anon access at all; `select` only for `authenticated` where `user_id = auth.uid()`; no insert/update/delete policies (I add myself with SQL in the dashboard).
- Explicit grants (don't rely on defaults): `grant select on <public tables & views> to anon, authenticated; grant insert, update, delete on <tables> to authenticated;`.

**2.3 Functions & views (`…_functions_views.sql`)**
- `public.level_points(p_position int) returns numeric`: reads `site_settings` and returns 0 for legacy positions, otherwise `round(greatest(points_min, points_max * power(points_decay, p_position - 1)), 2)`.
- `public.level_section(p_position int) returns text`: returns `'main' | 'extended' | 'legacy'`.
- Views `levels_view`, `players_view`, `records_view` **`with (security_invoker = true)`**, with the computed columns listed in PLAN §3. Points = `coalesce(points_override, level_points(position))`, but legacy is always 0. `players_view.rank` = `dense_rank() over (order by total_points desc)` among players with ≥ 1 completion; others get null rank.
- `public.admin_create_level(...)`: `security invoker`, `plpgsql`, starts with `if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;`. Clamps the position to 1..count+1, shifts `position >= p` by +1, inserts, writes history (`old null → new p`, reason 'added'), and returns the new row.
- `public.admin_move_level(p_level_id uuid, p_new_position int)`: same admin check; clamps; shifts the in-between rows by ±1; updates; writes history for the moved level (reason 'moved'). Shifted levels may also get history rows with reason 'shifted'; keep that cheap.
- An after-delete trigger on `levels` that closes the gap (`position > old.position` → −1). History for the deleted level is cascade-deleted, which is fine.
- `revoke execute on function admin_create_level, admin_move_level from anon, public; grant execute … to authenticated;`.
- View `recent_changes_view` (`security_invoker = true`) = a union, newest first, of: (a) `records` as `kind = 'record'` (player name/slug, level name/slug, date, attempts, video) using `coalesce(date_beaten, created_at::date)` as the event date, and (b) `level_position_history` rows with reason `'added'` or `'moved'` as `kind = 'level_added' | 'level_moved'` (level name/slug, old and new position). Skip `'shifted'` rows. Columns: `kind, happened_at, level_id, level_name, level_slug, player_name, player_slug, old_position, new_position, attempts`.
- `public.search_site(q text)` → `table(kind text, id uuid, name text, slug text, position int)`. `security invoker`, returns up to 8 levels + 8 players with `name ilike '%' || escaped(q) || '%'` (escape `\`, `%`, `_`). Returns nothing when `length(trim(q)) < 2`.

**2.4 Storage (`…_storage.sql`)**
- Create bucket `media` (public = true, `file_size_limit` 2 MB, `allowed_mime_types` png/jpeg/webp) via `insert into storage.buckets … on conflict do nothing`.
- Policies on `storage.objects`: public select where `bucket_id = 'media'`; insert/update/delete to `authenticated` only where `bucket_id = 'media' and public.is_admin()`. Path convention: `levels/<level-id>/<timestamp>.webp`, `players/<player-id>/<timestamp>.webp`.

**2.5 Seed**
- `supabase/seed.sql`: about 12 fake levels across difficulties and positions, about 6 fake players, about 25 records with varied attempts, enjoyment and dates, and a couple of real-format YouTube URLs that are clearly placeholders (or none). Insert positions directly (seed runs as the DB owner).
- `supabase/seed_cleanup.sql`: deletes all of it.

**2.6 Apply**
- **[MANUAL]** walk me through: `npx supabase login` (opens browser), then `npx supabase link --project-ref <ref>` (asks for the DB password), then you run `npx supabase db push`. If the CLI gives me trouble, the fallback is to paste each migration file in order into Supabase → SQL Editor. Then I run `seed.sql` in the SQL Editor.
- Run `npm run db:types` to generate `src/types/database.ts`.

**2.7 RLS proof: `scripts/check-rls.ts`**
- Loads `.env.local`, creates an **anon** client, and checks:
  - reading levels/players/records/views/settings **succeeds**;
  - inserting, updating and deleting on every table **fails or affects 0 rows** (an update or delete that matches 0 rows under RLS returns no error; count affected rows with `.select()` and treat "0 rows changed" as blocked, then re-read to confirm nothing changed);
  - `rpc('admin_move_level')` and `rpc('admin_create_level')` **fail**;
  - reading `admins` returns nothing;
  - a Storage upload to `media` **fails**.
- Prints a PASS/FAIL table and exits non-zero on any FAIL.

**Verify:** `npm run check:rls` is all PASS. **[MANUAL]**: I open Supabase → Advisors → Security Advisor and report any warnings; you fix them in a new migration. When that's done, **continue straight into Phase 3.**

---

## PHASE 3 — Data layer + utilities + unit tests

1. `src/lib/supabase.ts`: a single typed client `createClient<Database>(env.url, env.key)`.
2. `src/lib/queryClient.ts`: React Query with `staleTime` around 60s, `retry: 1`, `refetchOnWindowFocus: false`. Wrap the app in `QueryClientProvider`.
3. Pure utilities with **Vitest tests** for each:
   - `points.ts`: the same formula as SQL (for the admin preview). Tests: #1 = max, decay, floor, legacy = 0, override wins.
   - `youtube.ts`: `getYouTubeId(url)` handles `watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`, extra params, and invalid URLs → null. `youtubeEmbedUrl(id)` → `https://www.youtube-nocookie.com/embed/{id}`. `youtubeThumb(id)` → `https://i.ytimg.com/vi/{id}/hqdefault.jpg`.
   - `slug.ts`: `slugify` (accents stripped, lowercase, hyphens, max length), `uniqueSlug(base, existing)`.
   - `format.ts`: dates, `formatPoints` (2 decimals), `formatNumber`, `formatDuration(seconds)`, difficulty enum → label ("Extreme Demon").
   - `search.ts`: `escapeLike` (if used client-side).
   - `media.ts`: `publicMediaUrl(path)` and `levelThumbnail(level)` = uploaded path → else YouTube thumb from record/showcase video → else a generated placeholder (a CSS gradient component, not an image).
4. `src/api/` functions (typed, throw normalized `Error`s with friendly messages):
   - `getSettings()`
   - `getLevels({ section?, search?, difficulty?, playerId?, sort, page, pageSize })` → `{ rows, total }`. Sort options: `position` (default), `points`, `enjoyment`, `attempts`, `victors`, `newest`.
   - `getLevelBySlug(slug)`, `getLevelRecords(levelId)`, `getLevelHistory(levelId)`
   - `getPlayers({ search?, page, pageSize })` (ordered by rank), `getPlayerBySlug(slug)`, `getPlayerRecords(playerId)`
   - `getRecentChanges({ kind?, page, pageSize })` (reads `recent_changes_view`), `getRecentRecords(limit)`, `getSiteStats()` (counts, total attempts, difficulty distribution, completions per month), `searchSite(q)`
5. `src/hooks/`: React Query hooks wrapping each function, with sensible query keys.
6. A temporary `/dev/data` route showing JSON from a few hooks, to prove the wiring. **Remove it at the end of Phase 4.**

**Verify:** `npm test`, `npm run typecheck`, `npm run build` pass; `/dev/data` shows the seed data.

**End of Phase 3:** commit, send the progress line (include the RLS check, test results and Security Advisor outcome), and **continue straight into Phase 4**.

---

## PHASE 4 — Public site

General requirements for **every** page:
- Loading: skeletons shaped like the final content (not just a spinner).
- Error: `ErrorState` with a Retry button that calls `refetch`.
- Empty: a friendly `EmptyState` (e.g. "No levels yet").
- Not found (bad slug): a proper "Level not found" page with a link back.
- Set `document.title` per page (`"<Level> — Qwerty Crate"`), using a small `usePageTitle` hook.
- Responsive from 360px to wide desktop; no horizontal page scroll; tap targets ≥ 40px.

**4.1 List page `/list`**
- Section tabs: **Main / Extended / Legacy** (from settings sizes; show the position ranges in each tab).
- Controls: search box (debounced 300ms), difficulty filter, player filter (levels beaten by player X), sort select, view toggle **Cards / Table**. All state lives in the URL query params (`?section=main&q=&difficulty=&player=&sort=&view=&page=`), so back/forward and shared links work.
- **Card view** (inspired by the reference layout but with our styling): thumbnail on the left (16:9, lazy-loaded, fixed aspect so nothing shifts), `RankNumber #N` + level name, "by <creator>", difficulty badge, points, victor count, avg enjoyment. The whole card links to the level page.
- **Table view:** `Rank | Level | Difficulty | Player | Points | Enjoyment`. Player = first victor (linked) + "+N"; Enjoyment = average with 1 decimal or "—". On mobile, the table collapses into stacked rows (no sideways scrolling).
- Pagination: 25 per page, with page numbers + prev/next.
- **Sidebar:** about the list (short text), "How points work" (links to About), top 5 players, latest 5 records.

**4.2 Level page `/level/:slug`**
- Header: `RankNumber #N`, name, "by <creator> · verified by <verifier>", section badge, description.
- Video: embed the showcase video (or the first victor's video) via `VideoEmbed` using `youtube-nocookie`, `loading="lazy"`, a 16:9 container, and a title attribute. Non-YouTube URLs → an "Watch video ↗" button (`rel="noopener noreferrer"`).
- **Stat grid:** GD Level ID (with copy button), In-game difficulty, Our difficulty rating, Points, Length, Victors, Avg enjoyment, Avg attempts, First victor.
- **Records table:** Player (linked) | Date | Attempts | Enjoyment | Video (icon link) | Notes, sorted by date ascending (first victor first, marked with a badge).
- **Position history** (compact timeline).
- Prev/next level links (by position).
- Notes section if present.

**4.3 Players leaderboard `/players`**: rank (`RankNumber`), player (avatar/initials + optional flag emoji from country code), total points, completions, hardest level (linked). Search plus pagination.

**4.4 Player page `/player/:slug`**: header (avatar, name, rank, flag, channel link, bio); stat grid (rank, total points, completions, hardest, first victories, total attempts, avg enjoyment); completed levels table (Rank | Level | Points | Attempts | Enjoyment | Date | Video), sortable by position or date; a small difficulty-breakdown bar (CSS only).

**4.5 Home `/`**: hero (site name, one-line description, "View the list" button); stats strip (levels, players, records, total attempts); top 5 levels as cards; recent completions; top 5 players.

**4.6 Stats `/stats`**: totals, a difficulty distribution bar chart, completions per month, most-enjoyed levels, most attempts, hardest-per-player. Build charts with plain CSS/SVG bars; no chart library.

**4.7 About `/about`**: what the site is, how ranking and points work (show the formula with the current settings values), and the "not affiliated" disclaimer.

**4.9 Recent changes `/recent`**: a timeline of what changed lately, grouped by day ("Today", "Yesterday", then dates). Each entry is one line with an icon: "**Player** beat **Level** (attempts, video link)", "**Level** was added at #N", "**Level** moved from #A to #B (up/down arrow, green/red)". Filter chips: All / Completions / New levels / Moves (state in the URL). Paginated (30 per page). Skeleton, error and empty states like every other page. Also show a compact "Latest 5 changes" box on the home page and list sidebar linking here.

**4.8 Global search**: header button + `/` keyboard shortcut opens a modal; it calls `searchSite`, groups results into Levels and Players, supports keyboard navigation (↑/↓/Enter/Esc), and closes on navigation.

**Verify:** typecheck/lint/test/build pass. Remove `/dev/data`. Give me a manual test checklist covering every page, filter combinations, a bad slug, the empty state (tell me how to try it), mobile width 375px, and keyboard-only navigation.

**End of Phase 4:** write the public-site manual test checklist to `docs/TESTING.md` (include it in the Stage 1 checkpoint report too), commit, and **continue straight into Phase 5**.

---

## PHASE 5 — Authentication + admin dashboard

**5.1 [MANUAL] Supabase Auth setup.** Walk me through:
1. Authentication → Sign In / Providers → Email: enabled. **Turn OFF "Allow new users to sign up".**
2. Authentication → Users → Add user → Create new user: my email + a strong password, **Auto Confirm User** checked.
3. SQL Editor: `insert into public.admins (user_id) select id from auth.users where email = 'MY_EMAIL';`
4. Authentication → URL Configuration: Site URL `http://localhost:5173` for now (we change it at deploy); add `http://localhost:5173/**` to Redirect URLs.

**5.2 Auth code**
- `features/auth/AuthProvider.tsx`: holds `session` and `user`, uses `supabase.auth.getSession()` + `onAuthStateChange`, and exposes `signIn` and `signOut`.
- `useIsAdmin()`: `rpc('is_admin')` via React Query, keyed by user id.
- `RequireAdmin`: loading → spinner; no session → redirect to `/admin/login?next=…`; session but not admin → an "Access denied" page with a Sign out button; admin → render. Remember this is **only for the user experience**.
- `/admin/login`: email + password form, friendly error ("Invalid email or password"), disables the button while submitting, redirects to `next` or `/admin`. No sign-up link. Add a "Forgot password" link only if you also build the reset flow (`resetPasswordForEmail` + an `/admin/reset` page using the `PASSWORD_RECOVERY` event). Building it is preferred.
- Admin routes are lazy-loaded with `React.lazy` so public visitors don't download admin code.

**5.3 Admin layout:** sidebar nav (Dashboard, Levels, Ranking, Players, Records, Settings, "View site ↗", Sign out); top bar shows the logged-in email; responsive (the sidebar becomes a drawer on mobile).

**5.4 Admin pages** (all writes through `src/api/admin.ts`; every mutation invalidates the relevant React Query keys and shows a success/error toast; forms validate with zod and show inline errors; buttons show loading; unsaved-change warning on navigation away is nice-to-have):
- **Dashboard:** counts, last 10 records, last 10 position changes, **"Export backup (JSON)"** (downloads every table as one JSON file with a timestamped filename).
- **Levels list:** search, a table with position/name/difficulty/points/victors, edit/delete, "New level".
- **Level form (new/edit):** name; slug (auto-generated from name, editable, uniqueness checked); GD level ID; creator; verifier; in-game difficulty select; difficulty rating; **position** (on create → `admin_create_level`; on edit, if the position changed → `admin_move_level` after saving the other fields); points override (with a live "formula would give X" preview); showcase video URL (validated, shows a live embed preview); thumbnail upload (pick file → resize in the browser with canvas to max 1280px wide → WebP quality ~0.85 → upload to `media/levels/<id>/<ts>.webp` → save path; show a preview; "Remove custom thumbnail" button; delete the old file on replace); description; notes.
- **Ranking page:** the full ordered list (all sections, with section dividers) with ↑ / ↓ buttons and a "Move to #" input per row, each calling `admin_move_level`, optimistic UI with rollback on error, and a live points column. Also a "Preview order by difficulty rating" helper that shows a *suggested* order; apply it only after confirmation, as a sequence of moves.
- **Players list + form:** name, slug, country code (validated), channel URL, bio, avatar upload (same resize pipeline, 256px square crop). On delete, show the number of records that will also be deleted.
- **Records list + form:** filters by level and by player; the form has searchable selects for level and player, attempts, enjoyment (0–10, step 0.5), date beaten, video URL (with preview), notes. A duplicate (same player + level) gets a friendly error that links to the existing record. On the level edit page also show that level's records with "Add record for this level".
- **Settings:** main/extended sizes, points max/decay/min, a preview table of points for positions 1–10, 25, 50, and Save.
- Every delete uses the `Modal` confirm dialog with the cascade summary.

**5.5 Error handling:** map Postgres/PostgREST errors to friendly text (unique violation `23505` → "A level with that name/slug/GD ID already exists", `42501` / RLS → "You're not authorized — are you still logged in?", FK errors, network errors). Expired session → toast + redirect to login.

**Verify:**
- typecheck/lint/test/build pass; `npm run check:rls` still all PASS.
- Give me a manual admin test script: log in; create a player; create a level at #3 (check that the others shifted); add 2 records; edit enjoyment; upload a thumbnail; move the level to #1; check the points on the player page; change settings and watch the points update; delete a record, the level, the player; export a backup; log out; then confirm that visiting `/admin` redirects to login.
- **Tamper test:** in a logged-out browser, open DevTools console and try `fetch` / supabase-js inserts with the publishable key. Tell me the exact snippet to paste, and that it must fail.

**STAGE 1 CHECKPOINT (Phases 0 to 5).** Report: everything built, all verification results (typecheck, lint, tests, build, `check:rls`), the public-site checklist and the admin checklist from above, how to run the site locally, and what's left (polish + deploy). Remind me I'll create the Netlify site in Stage 2. STOP.

---

## PHASE 6 — Polish and hardening

1. **Security headers** in `netlify.toml` `[[headers]] for = "/*"`:
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://<ref>.supabase.co https://i.ytimg.com https://img.youtube.com; frame-src https://www.youtube-nocookie.com; connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Build it from the env var at build time or document that I must replace `<ref>`. Test it with `npm run build && npm run preview` plus a local Netlify check if possible (`npx netlify dev`), and make sure there are no CSP console errors.
   - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - Long cache headers for `/assets/*` (hashed files).
2. **Meta/SEO:** `index.html` title, description, theme-color, Open Graph + Twitter tags with `/og-image.png` (generate a simple branded 1200×630 PNG or SVG-derived image), `favicon.svg` (the QC monogram), `robots.txt` (allow public, disallow `/admin`), and `<meta name="robots" content="noindex">` set on admin pages.
3. **Accessibility pass:** semantic landmarks, labels on every input, alt text (level thumbnails: `"<name> thumbnail"`), color contrast ≥ 4.5:1 for text, keyboard-reachable everything, visible focus, `aria-live` region for toasts, modals trap focus.
4. **Performance:** lazy images with width/height set, route-level code splitting, preconnect to the Supabase URL and Google Fonts, no layout shift on cards. Report the bundle sizes from the build output.
5. **Responsive review** at 360, 768, 1024 and 1440 widths. List anything you changed.
6. **Optional, ask me first:** TOTP two-factor login for admin (enroll + challenge screens with `supabase.auth.mfa.*`) plus a migration changing `is_admin()` to also require `(auth.jwt() ->> 'aal') = 'aal2'`.
7. **Security self-review:** grep the repo for `service_role`, `sb_secret_`, `dangerouslySetInnerHTML`, `eval(`, hard-coded URLs or keys; confirm `.env.local` isn't tracked (`git ls-files | grep env`); confirm every table has RLS and correct policies (query `pg_policies` and print them); run `npm audit --omit=dev` and report the results.

**Verify:** everything still passes; note the findings in `docs/PROGRESS.md`. **Continue straight into Phase 7** (the manual deploy steps will pause for me).

---

## PHASE 7 — Deploy to Netlify

1. **[MANUAL]** Push to GitHub using the commands from Phase 0.
2. **[MANUAL]** Netlify → Add new site → Import an existing project → GitHub → `qwerty-crate`. Build settings come from `netlify.toml`. Before the first deploy (or right after, then redeploy), go to Site configuration → Environment variables and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`). Optionally rename the site to `qwerty-crate` → `https://qwerty-crate.netlify.app`.
3. **[MANUAL]** Supabase → Authentication → URL Configuration: set Site URL to the Netlify URL; add `https://<site>.netlify.app/**` to Redirect URLs (keep localhost).
4. If the CSP depends on the project ref, make sure the deployed headers are correct.
5. **Production smoke test** (give me a checklist): home loads; deep link `/level/<slug>` works on hard refresh; images and videos load; no console errors or CSP violations; admin login works on production; one edit saves and appears publicly; logged-out tamper test fails; the security headers show in DevTools → Network → Response headers (or securityheaders.com).
6. **Keep-alive and backups (explain both, implement if I agree):**
   - A GitHub Actions workflow on a weekly cron that sends one read request to the Supabase REST endpoint with the publishable key (stored as a GitHub Actions secret), so the free project doesn't pause from inactivity.
   - Backup instructions: the admin "Export JSON" button, and `npx supabase db dump --data-only -f backup.sql` (needs the DB password; never commit the output).
7. Update `README.md`: what the project is, local setup, env vars, the migration workflow (`npx supabase migration new` → edit → `npx supabase db push` → `npm run db:types`), deployment, backups, and "how to add yourself as admin" for disaster recovery.

**STAGE 2 / FINAL CHECKPOINT (Phases 6 + 7) — final report:** live URL, security-review findings, a summary of every phase, known limitations, and suggested next features. STOP.

---

## PHASE 8 — Optional later features (only when I ask)
- **GD auto-fill:** a Netlify Function `netlify/functions/gd-level.ts` that takes `?id=` and fetches level info from a community wrapper (e.g. GDBrowser's `/api/level/{id}`) with a timeout. It returns only the fields we need and is **admin-use only**: the function verifies the caller's Supabase JWT and `is_admin` before fetching. The admin form gets an "Auto-fill from GD ID" button that fills empty fields for review. Public pages never call it.
- Friend submissions queue (`pending_records` + approve/reject).
- Per-page link previews via a Netlify Edge Function that injects OG tags for `/level/*` and `/player/*`.
- Custom domain.
