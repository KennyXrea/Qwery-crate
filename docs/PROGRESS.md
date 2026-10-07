# Qwerty Crate — Progress log

> Updated at the end of every phase. A new Claude Code session should read
> `docs/BUILD_PROMPT.md`, `docs/PLAN.md` and this file, then continue from **Next step**.

## Current status

- **Stage:** 1 (Phases 0–5) — in progress
- **Last completed phase:** 1
- **Next step:** Phase 2 (database). First check that `.env.local` exists with real values (not the
  placeholders from `.env.example`). If it doesn't, stop and walk the owner through manual steps B and C.

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
| B | Supabase account + project `qwerty-crate` | Not started — needed before Phase 2 |
| C | Copy Project URL + publishable key + project ref into `.env.local` | Not started — needed before Phase 2 |
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
- `npm run check:rls` points at `scripts/check-rls.ts`, which is written in Phase 2 (step 2.7).
- `npm run db:types` needs `.env.local` with `SUPABASE_PROJECT_REF` and a one-time `npx supabase login`.
- Manual steps B and C (Supabase project + `.env.local`) are still open; they're needed before Phase 2.
