# Qwerty Crate — Architecture & Plan

A private/community Geometry Dash list for our friend group. It's inspired by demon lists like Pointercrate, but the branding, UI and code are all ours. The site doesn't use Pointercrate's API, scrape Pointercrate, or copy its assets.

---

## 1. Recommended architecture

```
 Browser (public visitors + you)
        │  HTTPS
        ▼
 Netlify (static hosting + CDN)  ── serves the built React app (HTML/JS/CSS)
        │
        │  supabase-js over HTTPS, using the *publishable/anon* key
        ▼
 Supabase
   ├─ Postgres  ── tables, views, SQL functions
   │     └─ Row Level Security (RLS): anyone can READ, only the admin can WRITE
   ├─ Auth      ── one email+password user (you); public sign-ups disabled
   └─ Storage   ── "media" bucket for thumbnails/avatars (public read, admin write)
```

**Is Netlify + Supabase + Supabase Auth a good choice? Yes.** Here's why:

- The site is mostly read-heavy public data with a single writer. A static frontend plus a hosted Postgres with RLS fits that exactly, and you don't need your own backend server.
- **Security lives in the database, not the frontend.** The key the browser uses is public by design. Even if someone copies it from DevTools, RLS refuses every insert, update or delete unless the request carries a valid login token for a user listed in the `admins` table.
- Both have free tiers that easily cover a friend-group site.
- The two caveats are covered in §12: Supabase free projects pause when inactive, and the free tier has no backups.

## 2. Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast, simple, outputs static files for Netlify |
| UI | **React 18/19 + TypeScript** | Components suit lists and cards; TS catches data-shape bugs |
| Routing | **React Router v7** (data/library mode, *not* framework mode) | Plain SPA routing |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) + CSS variables for theme tokens | Quick to build a consistent dark theme |
| Data | **@supabase/supabase-js v2** | Official client |
| Fetching/caching | **@tanstack/react-query** | Loading/error states, caching and refetching without hand-rolled code |
| Validation | **zod** | Validates admin forms and env vars |
| Tests | **Vitest** (+ an RLS check script) | Unit-tests the formulas and proves anonymous writes fail |
| DB changes | **Supabase CLI** migrations in `supabase/migrations/` | Schema is versioned in git, not just clicked into a dashboard |

**Why not Next.js?** Server rendering isn't needed here. It would add server functions, hydration issues and more Netlify configuration for little gain. The one thing an SPA loses is per-page link previews (Discord embeds); see §12.

## 3. Database schema

The core design point: **a level can be beaten by several friends.** So the data is split into three things: *levels* (list entries), *players* (people), and *records* (player X beat level Y). Attempts, enjoyment, date and video belong to the **record**. The level page shows aggregates such as average enjoyment, victor count and first victor.

### `site_settings` (exactly one row, id = 1)
| column | type | notes |
|---|---|---|
| id | int PK, check id = 1 | singleton |
| site_name | text | "Qwerty Crate" |
| main_list_size | int, default 25 | positions 1..25 = Main |
| extended_list_size | int, default 25 | positions 26..50 = Extended; beyond = Legacy |
| points_max | numeric, default 250 | points for #1 |
| points_decay | numeric, default 0.95 | each position below is worth ×0.95 |
| points_min | numeric, default 5 | floor for the last ranked position |
| updated_at | timestamptz | |

### `levels`
| column | type | notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| position | int, not null, **unique deferrable initially deferred**, > 0 | the ranking; 1 = hardest |
| name | text not null | |
| slug | text unique not null | URL: `/level/slug` (stable even when position changes) |
| gd_level_id | bigint unique, nullable | the in-game ID |
| creator | text | free text, e.g. "Zoink & more" |
| verifier | text, nullable | who verified it in-game (often not one of us) |
| difficulty | enum `gd_difficulty` | `easy_demon, medium_demon, hard_demon, insane_demon, extreme_demon` + non-demons `auto, easy, normal, hard, harder, insane` |
| difficulty_rating | numeric(4,2), nullable | **our** opinion score (e.g. 1–10) |
| points_override | numeric, nullable | if set, replaces the formula's points |
| length_seconds | int, nullable | |
| showcase_video_url | text, nullable | general showcase video (records have their own) |
| thumbnail_path | text, nullable | path in the Storage bucket; falls back to the YouTube thumbnail |
| description | text, nullable | short tagline |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | `updated_at` set by trigger |

### `players`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text unique not null (case-insensitive unique index on `lower(name)`) | |
| slug | text unique not null | `/player/slug` |
| country_code | char(2), nullable | optional flag |
| avatar_path | text, nullable | Storage path |
| channel_url | text, nullable | YouTube/Twitch |
| bio | text, nullable | |
| created_at / updated_at | timestamptz | |

### `records` (a player beat a level)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| level_id | uuid FK → levels **on delete cascade** | |
| player_id | uuid FK → players **on delete cascade** | |
| attempts | int, nullable, ≥ 1 | |
| enjoyment | numeric(3,1), nullable, 0–10 | this player's enjoyment |
| date_beaten | date, nullable | |
| video_url | text, nullable | completion video |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |
| **unique (level_id, player_id)** | | one completion per player per level |

### `level_position_history` (written automatically)
`id, level_id FK cascade, old_position int null, new_position int null, reason text, changed_at timestamptz`. It's shown on level pages ("Placed at #7 → moved to #5 → …").

### `admins`
`user_id uuid PK references auth.users on delete cascade, created_at`. It only ever contains you.

### Views (`with (security_invoker = true)` so RLS still applies)
- **`levels_view`**: every level plus `section` ('main' | 'extended' | 'legacy', derived from position and settings), `points`, `victor_count`, `avg_enjoyment`, `avg_attempts`, `first_victor_id/name/slug`, and `thumbnail_url` (computed client-side or in the view).
- **`players_view`**: every player plus `total_points`, `completions`, `hardest_level` (lowest position), `first_victories`, `total_attempts`, `avg_enjoyment`, `rank` (`dense_rank()` by total_points).
- **`records_view`**: records joined with level name/slug/position/points and player name/slug.

### Points formula (original, configurable)
```
points(position) =
   0                                              if section = legacy
   points_override                                if set
   max(points_min, points_max × points_decay^(position − 1))   otherwise
```
With the defaults, #1 = 250, #5 ≈ 204, #10 ≈ 158, #25 ≈ 73 and #50 ≈ 20. **A player's score is the sum of the points of every level they've beaten.** Points are computed and never stored, so moving a level updates everyone's score instantly.

### SQL functions
- `is_admin()` → boolean. `security definer`, `set search_path = ''`; checks that `auth.uid()` is in `public.admins`.
- `level_points(position int)` → numeric (the formula above, reading `site_settings`).
- `admin_move_level(level_id uuid, new_position int)`: checks `is_admin()`, shifts the levels in between, and writes history, all in one transaction.
- `admin_create_level(... , position int)`: inserts at that position, shifting the others down.
- Trigger on level delete: closes the gap (positions above shift up by one) and logs history.
- `search_site(q text)`: returns matching levels and players for the header search box. The input is escaped, and no user text is put into PostgREST `or()` strings.

## 4. Authentication approach

- **Supabase Auth, email + password, one user.** You create the user by hand in the Supabase dashboard and turn **"Allow new users to sign up" off**.
- After creating it, you run one SQL line to put your user ID into `admins`.
- The `/admin/login` page calls `supabase.auth.signInWithPassword`. The session (a JWT) is kept by supabase-js and sent with every request.
- `/admin/*` routes are wrapped in `<RequireAdmin>`. It checks there's a session **and** that `rpc('is_admin')` returns true, otherwise it redirects to login. **This guard is only for the user experience.** The real protection is RLS. Someone who edits the JS to skip the guard just sees forms whose saves all fail.
- Optional hardening (Phase 6): **TOTP two-factor login (MFA)**. `is_admin()` can then also require `auth.jwt()->>'aal' = 'aal2'`, so a leaked password alone can't write.

## 5. Security considerations

1. **RLS on every table**: `select` allowed for `anon` and `authenticated`; `insert/update/delete` only `using (public.is_admin()) with check (public.is_admin())`.
2. **Only the publishable/anon key is ever in the frontend.** The *secret / service_role* key is never in the repo, never in a `VITE_` variable and never on Netlify. Anything prefixed `VITE_` ends up public in the JS bundle.
3. `admin_*` functions re-check `is_admin()` inside the function body, and `execute` is revoked from `anon`.
4. Views use `security_invoker = true`, so they can't bypass RLS. Run the Supabase **Security Advisor** and fix every warning.
5. Storage bucket `media`: public read; insert/update/delete only when `is_admin()`. The bucket has a file-size limit (2 MB) and allowed types (png/jpeg/webp). Images are resized in the browser before upload.
6. **Input safety**: React escapes text by default, so never use `dangerouslySetInnerHTML`. Validate URLs (http/https only), and embed YouTube only through a parsed video ID (`youtube-nocookie.com/embed/{id}`), never a raw user URL in an iframe.
7. **Security headers** in `netlify.toml`: Content-Security-Policy (allow self, your Supabase URL, YouTube frames, YouTube image hosts), `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`.
8. **Automated proof**: `npm run check:rls` uses the public key and tries to insert, update and delete in every table and upload to Storage. Every attempt must fail.
9. `.env*` files are git-ignored; `.env.example` holds placeholders only.

## 6. How the public site talks to Supabase

- `src/lib/supabase.ts` creates **one** client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (validated with zod at startup, with a clear error screen if missing).
- All queries live in `src/api/*.ts` (e.g. `getLevels({ section, search, difficulty, sort, page })`). Components never call `supabase` directly.
- Pages use React Query hooks (`useLevels`, `useLevel(slug)`, `usePlayer(slug)`, …). These give the loading skeletons, error-with-retry states and caching.
- Lists read from the views, paginated with `.range(from, to)` and `{ count: 'exact' }`. Filter, sort and page state lives in the **URL query string**, so links are shareable.
- Types are generated with `supabase gen types typescript`, so the queries are type-checked.

## 7. How the admin dashboard works

`/admin` uses the same app and the same Supabase client, but you're logged in, so your requests carry the admin JWT and RLS allows writes. The admin pages are lazy-loaded so normal visitors don't download them.

| Page | What it does |
|---|---|
| `/admin` | Overview counts, quick links, recent changes, "Export backup (JSON)" button |
| `/admin/levels` | Searchable table; edit/delete; "New level" |
| `/admin/levels/new`, `/admin/levels/:id` | Form: name, slug (auto), GD ID, creator, verifier, difficulty, rating, points override, video, thumbnail upload, description, notes, position |
| `/admin/ranking` | Ordered list with ↑/↓ buttons and a "move to #" box, which calls `admin_move_level`; shows live points preview |
| `/admin/players`, `/new`, `/:id` | Player CRUD + avatar upload |
| `/admin/records`, `/new`, `/:id` | Pick level + player (searchable selects), attempts, enjoyment, date, video, notes |
| `/admin/settings` | List sizes and points formula, with a preview table |

Every form is validated with zod and shows a success or error toast. Deletes go through a confirm dialog that states the cascade (e.g. "This also deletes 4 records").

## 8. Netlify deployment

1. The code goes into a GitHub repo.
2. In Netlify, choose "Add new site → Import from Git" and pick the repo. Build command `npm run build`, publish directory `dist` (also set in `netlify.toml`).
3. Netlify → Site configuration → Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. `netlify.toml` contains the SPA fallback (`/* → /index.html 200`) so `/level/xyz` doesn't 404 on refresh, plus the security headers and Node version.
5. Supabase → Authentication → URL Configuration: set **Site URL** to the Netlify URL and add `http://localhost:5173` to Redirect URLs.
6. Every push to `main` redeploys automatically. Note that deploy previews talk to the **same** database.

## 9. Do you need a Geometry Dash API?

**Not for version 1.** Everything the site shows is either your own opinion (rating, enjoyment, points, ranking) or something you can type once (name, creator, ID, length). Store `gd_level_id` so the data is tied to the real level, and enter the rest by hand in the admin panel.

If you want auto-fill later:
- RobTop's game servers aren't a public API. They're undocumented and can block or change requests, and browsers can't call them directly (CORS).
- Community wrappers like **GDBrowser's API** (`/api/level/{id}`) are easier, but they're unofficial and can go down or rate-limit.
- **The safe pattern:** an "Auto-fill from GD ID" button in the *admin form only*. It calls a small Netlify Function, which calls the wrapper once; you review the fields and save them into **your** database. Public pages never depend on the external API, so if it breaks, the site still works.
- **Thumbnails without any API:** if a level has a YouTube video, use `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg` as the default thumbnail. You can upload a custom one to override it.

## 10. Folder structure

```
Qwerty Crate/                 ← repo root
├─ CLAUDE.md                  conventions for Claude Code
├─ netlify.toml
├─ .env.example               (.env.local is git-ignored)
├─ index.html  package.json  vite.config.ts  tsconfig*.json  eslint.config.js
├─ docs/
│  ├─ PLAN.md  BUILD_PROMPT.md  PROGRESS.md
│  └─ reference/              screenshots (inspiration only, git-ignored)
├─ public/                    favicon.svg, og-image.png, robots.txt
├─ scripts/check-rls.ts       proves anonymous writes fail
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/             0001_schema.sql, 0002_rls.sql, 0003_functions_views.sql, 0004_storage.sql …
│  ├─ seed.sql                clearly fake sample data (optional)
│  └─ seed_cleanup.sql
└─ src/
   ├─ main.tsx  router.tsx
   ├─ styles/index.css        Tailwind + theme tokens
   ├─ lib/                    supabase.ts, env.ts, queryClient.ts, points.ts, youtube.ts, slug.ts, format.ts, search.ts, image.ts
   ├─ types/                  database.ts (generated), models.ts
   ├─ api/                    levels.ts, players.ts, records.ts, settings.ts, search.ts, admin.ts
   ├─ hooks/                  useLevels.ts, useLevel.ts, usePlayers.ts, …
   ├─ features/auth/          AuthProvider.tsx, RequireAdmin.tsx
   ├─ components/
   │  ├─ layout/              Header, Footer, Sidebar, PageShell, MobileNav
   │  ├─ ui/                  Button, Card, RankNumber, Badge, Input, Select, Modal, Toast, Skeleton, Pagination, EmptyState, ErrorState
   │  ├─ level/               LevelCard, LevelTableRow, DifficultyBadge, VideoEmbed, LevelStatGrid, RecordsTable, PositionHistory
   │  └─ player/              PlayerRow, PlayerStatGrid, CompletionsList
   ├─ pages/                  Home, List, Level, Players, Player, Stats, About, NotFound
   │  └─ admin/               Login, Dashboard, Levels, LevelForm, Ranking, Players, PlayerForm, Records, RecordForm, Settings
   └─ test/                   *.test.ts
```

## 11. Development phases

| # | Phase | Ends when… |
|---|---|---|
| 0 | Prerequisites + accounts (you) | Node, Git, GitHub, Supabase project, Netlify account exist |
| 1 | Scaffold, theme, layout shell | `npm run build` passes; empty styled pages navigate |
| 2 | Database: schema, RLS, functions, views, storage, seed | Migrations applied; `check:rls` passes |
| 3 | Data layer: client, types, API, hooks, utils + unit tests | `npm test` green; a debug page lists seed data |
| 4 | Public site: list, level, players, player, home, stats, search | All pages work on desktop + mobile with real DB data |
| 5 | Auth + admin dashboard | You can do full CRUD; logged-out writes fail |
| 6 | Polish + hardening | Responsive/accessibility pass, meta tags, headers, optional MFA |
| 7 | Deploy to Netlify | Production smoke test passes |
| 8 | Later / optional | GD auto-fill function, submissions, per-page link previews |

## 12. Things you hadn't mentioned (and the defaults chosen)

1. **Several victors per level.** The data model supports it. The list's "Player" column shows the *first victor* plus "+N".
2. **What decides the rank?** You set the **position** by hand (group consensus). "Difficulty rating" is your number, and the ranking page has a "sort by rating" helper. Position history is recorded automatically.
3. **Points are derived from position.** You can tune the formula in Settings or override one level. You don't type points for every level.
4. **Enjoyment is per player.** The level page shows the average and each person's score.
5. **Main / Extended / Legacy sections.** These are derived from position, so a new hard level pushes the old #50 into Legacy automatically.
6. **Non-demon levels.** The difficulty enum includes them in case the group adds any.
7. **Stable URLs.** Use slugs, not positions (positions change).
8. **Videos.** YouTube is embedded privacy-friendly via `youtube-nocookie`. Other hosts (Medal, Twitch, Drive) show as a link button.
9. **Supabase free tier pauses** after about a week of no activity. Set up a weekly ping (GitHub Action or Netlify scheduled function) or just visit the site. The free tier has **no downloadable backups**, so use the admin "Export JSON" button or `supabase db dump` occasionally.
10. **Storage limits** (1 GB free). Thumbnails are resized to around 1280px WebP before upload.
11. **Link previews in Discord.** The SPA gives every page the same preview. Per-level previews would need a Netlify Edge Function later.
12. **Assets and branding.** Make your own logo, favicon and difficulty badges. Don't reuse Pointercrate's look or RobTop's difficulty-face images.
13. **Password reset / Site URL** must point at the Netlify domain, or reset emails will link to localhost.
14. **Deploy previews write to production data.** Only log into admin on the main domain.
15. **Accessibility and 404 page**, keyboard navigation in admin, and empty states for when there's no data yet.
16. **Custom domain** (optional, e.g. `qwertycrate.xyz`). Netlify provides HTTPS automatically.
17. **Future: friend submissions** (a `pending_records` table plus an approve button). This is out of scope for v1.

## 13. Visual direction (original, not Pointercrate)

- **Theme (chosen: blue + white on dark):** near-black navy background (`#0a0e17`), raised surfaces (`#111826` / `#182133`), thin borders (`#243049`), white text (`#f4f7fd`) / muted `#8d99b3`.
- **Accent:** blue `#4f8cff` for links and highlights, a deeper blue `#2f6fed` for filled buttons (white text), soft blue `#7aa8ff` on hover. Top 3 positions are gold, silver and bronze.
- **Rank:** a **plain bold number** (`#1`) in the display font. The background is a soft blue glow with a faint dot grid. No blue-squares pattern, so it doesn't look like Pointercrate.
- **Logo:** the wordmark "QWERTY CRATE" with a simple blue "QC" monogram square.
- **Menu:** List, Players, Stats, **Recent changes** (new completions, new levels, ranking moves), About. The list defaults to the **card view**.
- **Type:** *Space Grotesk* (headings), *Inter* (body), *JetBrains Mono* (numbers and stats).
- **Layouts kept from the reference screenshots:** card list with thumbnail on the left, a sidebar with list info, a level page with the video on top then a stat grid, and a records table. The list also gets a compact table view (Rank | Level | Difficulty | Player | Points | Enjoyment).
