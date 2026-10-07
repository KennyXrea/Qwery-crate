/**
 * Regenerates src/types/database.ts from the Supabase project.
 * Usage: npm run db:types — reads SUPABASE_PROJECT_REF from .env.local.
 * Needs a one-time `npx supabase login` first. Works on macOS, Linux and Windows.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const ENV_FILE = resolve('.env.local')
const OUT_FILE = resolve('src/types/database.ts')

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

if (!existsSync(ENV_FILE)) {
  fail('.env.local was not found. Copy .env.example to .env.local and fill in your values first.')
}
process.loadEnvFile(ENV_FILE)

const ref = process.env.SUPABASE_PROJECT_REF?.trim() ?? ''
if (!ref || ref === 'YOUR-PROJECT-REF') {
  fail('SUPABASE_PROJECT_REF in .env.local is missing or still the placeholder value.')
}
// Project refs are 20 lowercase letters/digits (the part before .supabase.co in the project URL).
// The value itself is never printed: if a key was pasted here by mistake, it must not end up in
// a terminal log or a chat.
if (!/^[a-z0-9]{20}$/.test(ref)) {
  const looksLikeKey = ref.startsWith('sb_') || ref.startsWith('eyJ')
  fail(
    `SUPABASE_PROJECT_REF doesn't look like a project ref (expected 20 lowercase letters/digits, got ${ref.length} characters)${
      looksLikeKey ? '. That looks like an API key, not a project ref' : ''
    }.`,
  )
}

// Run the Supabase CLI's own Node launcher directly (the "supabase" package's `bin`), without
// npx or a shell, so it works the same on macOS, Linux and Windows.
function findSupabaseCli(): string {
  try {
    const packageJson = createRequire(import.meta.url).resolve('supabase/package.json')
    const { bin } = JSON.parse(readFileSync(packageJson, 'utf8')) as { bin: { supabase: string } }
    return resolve(dirname(packageJson), bin.supabase)
  } catch {
    return fail('The Supabase CLI is not installed. Run `npm install` first.')
  }
}

const cli = findSupabaseCli()

const result = spawnSync(
  process.execPath,
  [cli, 'gen', 'types', 'typescript', '--project-id', ref, '--schema', 'public'],
  { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] },
)

if (result.error) fail(`Could not run the Supabase CLI: ${result.error.message}`)
if (result.status !== 0 || !result.stdout.trim()) {
  // The CLI prints some errors (e.g. "Access token not provided") to stdout, which we captured.
  if (result.stdout.trim()) console.error(result.stdout.trim())
  fail(
    'Type generation failed (see the message above). If it mentions an access token, run `npx supabase login` first.',
  )
}

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, result.stdout)
console.log(`✔ Wrote ${OUT_FILE}`)
