# Qwerty Crate — Progress log

> Updated at the end of every phase. A new Claude Code session should read
> `docs/BUILD_PROMPT.md`, `docs/PLAN.md` and this file, then continue from **Next step**.

## Current status

- **Stage:** 1 (Phases 0–5) — in progress
- **Last completed phase:** 0
- **Next step:** Phase 1 (scaffold, theme, layout shell)

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
