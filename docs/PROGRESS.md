# Qwerty Crate — Progress log

> Updated at the end of every phase. A new Claude Code session should read
> `docs/BUILD_PROMPT.md`, `docs/PLAN.md` and this file, then continue from **Next step**.

## Current status

- **Stage:** 1 (Phases 0–5) — in progress
- **Last completed phase:** 2
- **Next step:** Phase 3 (data layer). The pure utilities in `src/lib` (points, format, url, youtube,
  media, slug, search, queryClient) and their tests are already written; still to do: `src/lib/supabase.ts`,
  `src/api/*`, `src/hooks/*`, the temporary `/dev/data` page.

## Phase 0 — Prerequisites, accounts and repo ✅

**Tool versions (macOS):** Node v24.18.0 · npm 11.16.0 · git 2.39.5 (Apple Git-154)

**Files moved**
- `Claude outputs/PLAN.md` and `Claude outputs/BUILD_PROMPT.md` → `docs/` (these were the newer
  versions with the blue design and the 2-stage plan; they replaced older drafts in `docs/`).
  The empty `Claude outputs/` folder was removed.
- 3 reference screenshots → `docs/reference/` (git-ignored).
- The GitHub Desktop clone in `Qwery crate/` (one "Initial commit" with `.gitattributes`, remote
  `origin = https://github.com/KennyXrea/Qwery-crate.git`) was adopted as the project repo: its
  `.git` folder and `.gitattributes` were moved up into the project root, and the empty folder removed.
  Branch is `main`, so the first push later is a plain `git push`.

**Created:** `.gitignore`, `docs/PROGRESS.md`

**Manual steps (owner: you)**
| Step | What | Status |
|---|---|---|
| A | GitHub repo | Exists as `KennyXrea/Qwery-crate`, but it is **public** — plan says private. Make it private before Phase 7. |
| B | Supabase account + project `qwerty-crate` | Done (2026-10-07). Database password saved by the owner. |
| C | Copy Project URL + publishable key + project ref into `.env.local` | Done (2026-10-07). Format checked and key accepted by Supabase. |
| D | Netlify account | Not started — can wait until Phase 7 |

**Known issues:** none.

## Phase 1 — Scaffold, theme, layout shell ✅

**Versions installed:** Vite 8.3 · React 19.3 · TypeScript 6.0 (strict) · Tailwind CSS 4.3 ·
React Router 7.18 (data mode) · zod 4.6 · Vitest 5.0 · ESLint 10 · supabase-js 2.117 ·
TanStack Query 5.104 · Supabase CLI 2.120

**Built**
- Vite + React + TS scaffold, npm scripts (`dev`, `build`, `preview`, `typecheck`, `lint`, `format`,
  `test`, `test:watch`, `check:rls`, `db:types`), `.nvmrc`, `.prettierrc`, `.env.example`, ESLint
  (react-hooks v7, react-refresh, no `dangerouslySetInnerHTML`, zod only via `src/lib/zod.ts`).
- `src/lib/env.ts`: zod check of `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (missing,
  placeholder, not https, not just the Project URL, secret key, not a Supabase key). `main.tsx` shows
  a full-page configuration error instead of crashing, and a separate "failed to load" page with a
  Reload button if the app's code can't be downloaded.
- Build-time guard in `vite.config.ts`: `npm run build` fails if any `VITE_` variable holds a
  secret/service_role key or is named like a secret (shared rules in `src/lib/env-keys.ts`).
- Theme tokens (PLAN §13), fonts, blue top glow + faint dot grid, focus rings, reduced motion,
  `scroll-padding-top` so focused elements never hide under the sticky header.
- UI primitives in `src/components/ui/`: Button, ButtonLink, Card (+ `STRETCHED_LINK` for clickable
  cards), RankNumber, Badge, Input, Textarea, Select, Modal, Toast system, Skeleton, Spinner,
  Pagination, EmptyState, ErrorState, icons.
- Layout: Header (logo, nav List · Players · Stats · Recent changes · About, search button + "/"
  shortcut, mobile menu), MobileNav, SearchDialog (placeholder), Footer, PageShell + Sidebar,
  RootLayout (skip link; focus moves to the new page's content after navigation).
- Router (`src/router.tsx` + `src/routes.tsx`): every route from the plan with styled placeholder
  pages, lazy admin pages, finished NotFound, route error page.
- `CLAUDE.md`, `netlify.toml` (SPA fallback), `scripts/db-types.ts`.

**Verification:** `npx tsc -b` ✔ · `npx eslint .` ✔ (0 problems) · `npx vitest run` ✔ 157 tests in
9 files · `npm run build` ✔ · `npx prettier --check .` ✔. Also checked in a browser at 320–1440px
(keyboard, mobile menu, forced colors) and against the planned Phase 6 CSP (no violations).

**Deviations from BUILD_PROMPT / the Phase 1 plan (on purpose)**
- Netlify `NODE_VERSION = "24"` instead of `"22"`: matches `.nvmrc` and the current LTS
  (`package.json` engines needs ≥ 22.12, so 22 would also work).
- React Router stays on 7.18 although v8 exists: the build prompt names v7.
- Two extra theme tokens: `accent-hover #2a62d6` (hover for white-text buttons, keeps ≥ 4.5:1) and
  `border-strong #5a6c94` (form-field outlines, ≥ 3:1).
- A developer-only UI kit page at `/dev/ui`; it is left out of production builds.
- `db:types` is a small tsx script (`scripts/db-types.ts`) that reads `.env.local` and runs the
  Supabase CLI directly (no npx, no shell), so it works the same on macOS, Linux and Windows.
- `Button loading` uses `aria-disabled` + `aria-busy` and ignores clicks instead of the native
  `disabled` attribute (the plan said "loading → disabled"), so keyboard focus stays on the button.
- The mobile menu closes on every navigation by tracking the location key (the plan's "remember the
  path it was opened on" re-opened it after Logo → back to that page), and also closes when keyboard
  focus leaves the header.
- The header search button is an icon button below `lg` and shows "Search" + `/` from `lg` up (the
  plan said from `md`, but the label squeezes the logo at tablet widths).
- zod is configured `jitless` in `src/lib/zod.ts` so it never probes `eval()` (the Phase 6 CSP
  forbids it); always import zod from there.

**Known issues**
- `npm run db:types` needs `.env.local` with `SUPABASE_PROJECT_REF` and a one-time `npx supabase login`.
- Manual steps B and C (Supabase project + `.env.local`) are done (2026-10-07).

## Phase 2 — Database: schema, RLS, functions, views, storage, seed ✅

**Built** (`supabase/`, created with `npx supabase init`; project linked, region us-east-1, Postgres 17)
- `migrations/20261007140000_schema.sql`: enum `gd_difficulty`; tables `site_settings` (singleton +
  default row), `levels`, `players`, `records`, `level_position_history`, `admins`; all checks, the
  deferrable unique `levels.position`, `lower(players.name)` unique index, indexes, `set_updated_at()`.
- `…140100_rls.sql`: `is_admin()`, RLS on every table, one policy per action (public read; admin
  insert/update/delete), `admins` readable only as your own row, revoke-all-then-grant privileges.
- `…140200_functions_views.sql`: `level_section()`, `level_points()`, `records_view`, `levels_view`,
  `players_view`, `recent_changes_view` (all `security_invoker`), `search_site()`,
  `admin_create_level()`, `admin_move_level()`, `admin_delete_level()`, gap-closing delete trigger.
- `…140300_storage.sql`: public bucket `media` (2 MB, png/jpeg/webp) with admin-only policies.
- `seed.sql` (12 "Sample Level N", 6 "Player …", 26 records, 15 history rows, all fake) and
  `seed_cleanup.sql` (deletes exactly those rows by slug; real data stays).
- `scripts/check-rls.ts` (`npm run check:rls`), `src/types/database.ts` (generated).

**How it was applied:** the owner ran `npx supabase login` (Terminal) and
`npx supabase db push --include-seed --yes` (Claude Code's auto mode refuses to push to the real
database itself; the owner runs pushes with `! <command>`). `npx supabase link` needed no database
password (the CLI 2.120 uses a temporary login role).

**Verification**
- Before applying: a PGlite (Postgres-in-WASM) harness in the session scratchpad with Supabase stubs
  ran 163 behavioural checks (RLS as anon / non-admin / admin, ranking create/move/delete incl.
  multi-row deletes, points, views, search escaping, storage) — all pass; 29/29 injected SQL
  mutations caught. Four adversarial reviews (security, ranking, spec, derived data); fixes applied.
- `npm run check:rls`: 40/40 PASS + 1 NOTE (storage listing can only be proven once images exist).
- Live points check: `levels_view` points and the `level_points` RPC match `src/lib/points.ts`.
- Security Advisor (`npx supabase db advisors --linked --type all`): **no security issues**; only 3
  INFO "unused index" notes (new database, no traffic yet).
- `npm run typecheck`, `lint`, `test` (511 tests), `build`, `prettier --check` all pass.

**Deviations from BUILD_PROMPT / PLAN (on purpose)**
- `is_admin()` is SECURITY INVOKER and executable only by `authenticated` (not DEFINER/anon): the
  Advisor warns (lints 0028/0029) about DEFINER functions callable by API roles, and it isn't needed
  because a user can read their own `admins` row. Visitors calling `rpc('is_admin')` get 42501, so the
  frontend only asks when logged in.
- Storage has **no public SELECT policy**: public-bucket files are served by URL without one, and a
  public SELECT policy would let anyone list every file. Admins have SELECT (needed to replace/delete).
- Extra safety: a deferred constraint trigger refuses gaps in the ranking (positions are always
  exactly 1..n), so position changes must go through `admin_create_level` / `admin_move_level` /
  `admin_delete_level` (new; takes the ranking lock before deleting, avoiding deadlocks). Admin
  PATCHes must not send `position`.
- `level_position_history.seq` (identity) orders rows written in one transaction: timelines order by
  `changed_at desc, seq desc`.
- `difficulty_rating` is `numeric(5,2)` (PLAN said (4,2), which can't store the allowed maximum 100).
- `site_settings` list sizes are capped at 10000; `search_site` ignores queries over 100 characters.
- The views inline the points formula (much faster than calling the function per row); it now lives
  in `level_section`, `level_points`, `records_view`, `levels_view` and `src/lib/points.ts` — change
  them together. With defaults #50 = **20.25** (PLAN's "≈ 20" is right; 20.27 was a typo).
- `levels_view` also has `first_victor_video_url` (fallback thumbnail) and `first_victory_date`;
  `recent_changes_view` also has `id`, `event_date`, `player_id`, `video_url`. Order it by
  `event_date desc, happened_at desc, kind, id`.
- First victor = earliest `date_beaten` (unknown dates last), then entry time, then id.

**Known issues**
- `seed.sql` is only for an empty list (it inserts positions 1–12). Don't re-run it after adding real
  levels; run `seed_cleanup.sql` in the SQL Editor when the sample data should go.
- The PGlite harness lived in the session scratchpad and is not in the repo (it would need
  `@electric-sql/pglite` as a dev dependency — ask the owner before adding it).

