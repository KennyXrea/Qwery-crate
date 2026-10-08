/**
 * RLS proof (BUILD_PROMPT 2.7, PLAN §5): talks to Supabase exactly like a logged-out visitor of
 * the website (the publishable / anon key, no login) and checks that:
 *   - everything public can be read: tables, views, settings and search;
 *   - every write is refused: insert, update and delete on every table, the admin_* functions
 *     and a Storage upload; and the admins table and the list of uploaded files stay hidden.
 * Usage: npm run check:rls (reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from
 * .env.local; variables already set in the terminal win). Prints a PASS/FAIL/NOTE table and
 * exits with code 1 if anything failed. It never prints the URL or the key.
 *
 * The writes use valid values, so a PASS means a permission check stopped them (Postgres error
 * 42501), not some other rule. If a write ever got through, the script tries to undo it and
 * reports FAIL; anything left behind is named "rls-check-should-not-exist".
 *
 * Reads need data to prove anything: a table that looks empty to a visitor might really be
 * hidden from them. So 0 rows is a FAIL, unless you run it with --allow-empty
 * (npm run check:rls -- --allow-empty) because the list really is empty; then it is a NOTE.
 * NOTE = "could not be proven with the data there is right now" (not a failure).
 */
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { styleText } from 'node:util'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isPublishableKey, isSecretKey } from '../src/lib/env-keys.ts'

const ENV_FILE = resolve('.env.local')
/** Name, slug and notes used by every write attempt, so a leftover would be easy to spot. */
const DUMMY = 'rls-check-should-not-exist'
/** A date no real history row has: marks the fake level_position_history row. */
const DUMMY_TIME = '2000-01-01T00:00:00+00:00'
/** Postgres "insufficient privilege": no grant, an RLS policy said no, or is_admin() said no. */
const PERMISSION_DENIED = '42501'
/** PostgREST/Postgres codes for "no such table / function": the migrations aren't applied. */
const NOT_FOUND_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883'])
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const REQUEST_TIMEOUT_MS = 20_000
/** --allow-empty: an empty table is reported as NOTE instead of FAIL. */
const ALLOW_EMPTY = process.argv.slice(2).includes('--allow-empty')
/** The only Storage answers that prove row-level security (or a missing grant) said no. */
const STORAGE_REFUSAL = /row-level security|permission denied/i
/** A valid 1×1 transparent PNG (68 bytes): the smallest file the media bucket would accept. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// ── Configuration ─────────────────────────────────────────────────────────────────────────────

const hasEnvFile = existsSync(ENV_FILE)
if (hasEnvFile) {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch {
    fail('.env.local could not be read. It should be a plain text file with NAME=value lines.')
  }
}

const rawUrl = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const rawKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
if (!hasEnvFile && !rawUrl && !rawKey) {
  fail('.env.local was not found. Copy .env.example to .env.local and fill in your values first.')
}

// Same rules as src/lib/env.ts. The values themselves are never printed.
function readSupabaseUrl(value: string): URL {
  if (!value) fail('VITE_SUPABASE_URL is missing in .env.local.')
  if (/your-project-ref/i.test(value)) {
    fail('VITE_SUPABASE_URL in .env.local is still the placeholder value from .env.example.')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    fail(
      'VITE_SUPABASE_URL is not a web address. It should look like https://abcdefghijklmnopqrst.supabase.co',
    )
  }
  // Plain http is only acceptable for a Supabase instance running on this computer.
  const isLocal = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !isLocal) {
    fail(
      'VITE_SUPABASE_URL must start with https://, like https://abcdefghijklmnopqrst.supabase.co',
    )
  }
  if (url.pathname.replace(/\/+$/, '') || url.search || url.hash || url.username || url.password) {
    fail(
      'VITE_SUPABASE_URL should be just the Project URL, like https://abcdefghijklmnopqrst.supabase.co',
    )
  }
  return url
}

function readPublishableKey(value: string): string {
  if (!value) fail('VITE_SUPABASE_PUBLISHABLE_KEY is missing in .env.local.')
  if (value.toLowerCase() === 'sb_publishable_xxx') {
    fail('VITE_SUPABASE_PUBLISHABLE_KEY in .env.local is still the placeholder from .env.example.')
  }
  if (isSecretKey(value)) {
    // A secret key skips every security rule, so the "must fail" writes below would really
    // change data. Never run the check with one.
    fail(
      'VITE_SUPABASE_PUBLISHABLE_KEY holds a SECRET (service_role) key. Remove it from .env.local right away and put the publishable key there instead.',
    )
  }
  if (!isPublishableKey(value)) {
    fail(
      'VITE_SUPABASE_PUBLISHABLE_KEY doesn\'t look like a Supabase publishable key (it should start with sb_publishable_, or be the legacy "anon public" key).',
    )
  }
  return value
}

const projectUrl = readSupabaseUrl(rawUrl)
const publishableKey = readPublishableKey(rawKey)

// Error texts can contain the server name; hide it (and, to be safe, the key) before printing.
const hiddenValues = [
  projectUrl.origin,
  projectUrl.host,
  projectUrl.hostname,
  projectUrl.hostname.split('.')[0],
  publishableKey,
].filter((value) => value.length >= 8)

function redact(text: string): string {
  return hiddenValues.reduce((out, value) => out.split(value).join('<hidden>'), text)
}

/** fetch with a time limit, so an unreachable server can't make the check hang. */
function fetchWithTimeout(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

let supabase: SupabaseClient
try {
  // Untyped on purpose: this script must keep working before src/types/database.ts exists.
  supabase = createClient(projectUrl.origin, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  })
} catch (error) {
  fail(
    `Could not create the Supabase client: ${redact(error instanceof Error ? error.message : String(error))}`,
  )
}

// ── Results ───────────────────────────────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'NOTE'
type Result = { group: string; check: string; status: Status; detail: string }
const results: Result[] = []
let currentGroup = ''

function report(check: string, pass: boolean, detail: string): boolean {
  results.push({
    group: currentGroup,
    check,
    status: pass ? 'PASS' : 'FAIL',
    detail: redact(detail),
  })
  return pass
}

/** Neither PASS nor FAIL: the current data can't prove this check either way. */
function note(check: string, detail: string): void {
  results.push({ group: currentGroup, check, status: 'NOTE', detail: redact(detail) })
}

/** A read that returned 0 rows: FAIL (proves nothing), or NOTE with --allow-empty. */
function reportEmpty(check: string): void {
  const why = 'the table is empty, or visitors cannot see its rows'
  if (ALLOW_EMPTY) note(check, `0 rows (${why}; allowed by --allow-empty)`)
  else {
    report(
      check,
      false,
      `0 rows: ${why}. Apply the seed (or add data) and run again; if it is empty on purpose, run: npm run check:rls -- --allow-empty`,
    )
  }
}

type Row = Record<string, unknown>
type ApiError = { message: string; code?: string; details?: string | null }

function oneLine(text: string, max = 90): string {
  const line = text.split('\n')[0].trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

function describeNetwork(error: ApiError): string {
  // Only the message and the "Caused by: …" line: the rest of `details` is a stack trace.
  const cause = /Caused by: (.*)/.exec(error.details ?? '')?.[1] ?? ''
  const text = `${error.message} ${cause}`
  if (/ENOTFOUND|EAI_AGAIN/.test(text)) {
    return "network error: the server wasn't found (check VITE_SUPABASE_URL and your internet connection)"
  }
  if (/ECONNREFUSED/.test(text)) return 'network error: the connection was refused'
  if (/TimeoutError|ETIMEDOUT|CONNECT_TIMEOUT|aborted/i.test(text)) {
    return 'network error: no answer in time'
  }
  return `network error: ${oneLine(cause || error.message)}`
}

/** Plain-words summary of an API error, e.g. "permission denied for table levels (42501)". */
function describe(error: ApiError, status: number): string {
  if (status === 0) return describeNetwork(error)
  const code = error.code ? ` (${error.code})` : ''
  const hint =
    error.code && NOT_FOUND_CODES.has(error.code)
      ? ' — not found: have the migrations been applied? (or a name changed: update this script)'
      : ''
  return `${oneLine(error.message || 'unknown error')}${code}${hint}`
}

/** PASS only for a permission error: any other error doesn't prove that security stopped it. */
function judgeRefusal(check: string, error: ApiError, status: number): boolean {
  if (error.code === PERMISSION_DENIED)
    return report(check, true, `refused: ${describe(error, status)}`)
  if (status === 0) return report(check, false, `could not check — ${describe(error, status)}`)
  return report(
    check,
    false,
    `failed, but not with a permission error, so this proves nothing: ${describe(error, status)}`,
  )
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// ── Tables ────────────────────────────────────────────────────────────────────────────────────

type Snapshot = { count: number; target: Row | null }

type TableSpec = {
  table: string
  key: string
  /** Key used when the table is empty (so the request is still well-formed). */
  fallbackKey: string | number
  /** Picks the row the update/delete attempts aim at: the least important one. */
  order: { column: string; ascending: boolean }
  /** A valid new row; it gets the snapshots so it can point at rows that really exist. */
  insert: (snapshots: Map<string, Snapshot>) => Row
  /** Finds the row again if the insert wrongly succeeded, so it can be removed. */
  marker: { column: string; value: string }
  /** A valid change. `watch` is the column re-read afterwards to prove nothing changed. */
  update: Row
  watch: string
}

const PUBLIC_TABLES: TableSpec[] = [
  {
    table: 'site_settings',
    key: 'id',
    fallbackKey: 1,
    order: { column: 'id', ascending: true },
    // The singleton row: if security failed, this would be a duplicate (23505), which is
    // reported as FAIL too, because only 42501 counts as refused.
    insert: () => ({ id: 1, site_name: DUMMY }),
    marker: { column: 'site_name', value: DUMMY },
    update: { site_name: DUMMY },
    watch: 'site_name',
  },
  {
    table: 'levels',
    key: 'id',
    fallbackKey: randomUUID(),
    order: { column: 'position', ascending: false },
    insert: (snapshots) => ({
      name: DUMMY,
      slug: DUMMY,
      position: Number(snapshots.get('levels')?.target?.position ?? 0) + 1,
      creator: 'RLS check',
      difficulty: 'extreme_demon',
    }),
    marker: { column: 'slug', value: DUMMY },
    update: { name: DUMMY },
    watch: 'name',
  },
  {
    table: 'players',
    key: 'id',
    fallbackKey: randomUUID(),
    order: { column: 'created_at', ascending: false },
    insert: () => ({ name: DUMMY, slug: DUMMY }),
    marker: { column: 'slug', value: DUMMY },
    update: { name: DUMMY },
    watch: 'name',
  },
  {
    table: 'records',
    key: 'id',
    fallbackKey: randomUUID(),
    order: { column: 'created_at', ascending: false },
    insert: (snapshots) => ({
      level_id: String(snapshots.get('levels')?.target?.id ?? randomUUID()),
      player_id: String(snapshots.get('players')?.target?.id ?? randomUUID()),
      attempts: 1,
      enjoyment: 5,
      date_beaten: '2026-01-01',
      notes: DUMMY,
    }),
    marker: { column: 'notes', value: DUMMY },
    update: { notes: DUMMY },
    watch: 'notes',
  },
  {
    table: 'level_position_history',
    key: 'id',
    fallbackKey: randomUUID(),
    order: { column: 'changed_at', ascending: false },
    insert: (snapshots) => ({
      level_id: String(snapshots.get('levels')?.target?.id ?? randomUUID()),
      old_position: null,
      new_position: 1,
      reason: 'added',
      changed_at: DUMMY_TIME,
    }),
    marker: { column: 'changed_at', value: DUMMY_TIME },
    update: { changed_at: DUMMY_TIME },
    watch: 'changed_at',
  },
]

const VIEWS = ['levels_view', 'players_view', 'records_view', 'recent_changes_view']

/** Row count plus the row the write attempts will aim at. */
async function takeSnapshot(spec: TableSpec): Promise<Snapshot | string> {
  const { data, error, count, status } = await supabase
    .from(spec.table)
    .select('*', { count: 'exact' })
    .order(spec.order.column, { ascending: spec.order.ascending })
    .limit(1)
  if (error) return describe(error, status)
  const rows = (data ?? []) as Row[]
  return { count: count ?? rows.length, target: rows[0] ?? null }
}

async function checkRead(spec: TableSpec): Promise<Snapshot | null> {
  const check = `read ${spec.table}`
  const snapshot = await takeSnapshot(spec)
  if (typeof snapshot === 'string') {
    report(check, false, snapshot)
    return null
  }
  if (spec.table === 'site_settings' && snapshot.count !== 1) {
    report(
      check,
      false,
      `expected exactly 1 row, got ${snapshot.count}: missing, or hidden from visitors`,
    )
  } else if (snapshot.count === 0) {
    reportEmpty(check)
  } else {
    report(check, true, plural(snapshot.count, 'row'))
  }
  return snapshot
}

async function checkViewRead(view: string): Promise<void> {
  const check = `read ${view}`
  const { error, count, status } = await supabase
    .from(view)
    .select('*', { count: 'exact' })
    .limit(1)
  if (error) report(check, false, describe(error, status))
  else if (!count) reportEmpty(check)
  else report(check, true, plural(count, 'row'))
}

async function attemptInsert(spec: TableSpec, payload: Row): Promise<boolean> {
  const check = `${spec.table}: insert`
  // No .select() here: asking for the new row back would also need read access, which could
  // hide an insert that is allowed on its own.
  const { error, status } = await supabase.from(spec.table).insert(payload)
  if (error) return judgeRefusal(check, error, status)
  const { data } = await supabase
    .from(spec.table)
    .delete()
    .eq(spec.marker.column, spec.marker.value)
    .select(spec.key)
  const undone = (data ?? []).length > 0
  return report(
    check,
    false,
    `ALLOWED: a visitor added a row! ${
      undone
        ? 'It was removed again.'
        : `Delete the row where ${spec.marker.column} = '${spec.marker.value}' by hand.`
    }`,
  )
}

/** The row(s) an update/delete aims at. `emptyTable`: there was no real row to aim at. */
type Target = { column: string; value: string | number; everyRow: boolean; emptyTable: boolean }

const emptyNote = (target: Target) =>
  target.emptyTable ? ' (table empty: this proves little)' : ''

async function attemptUpdate(
  spec: TableSpec | AdminsSpec,
  target: Target,
  original: Row | null,
): Promise<boolean> {
  const check = `${spec.table}: update`
  const base = supabase.from(spec.table).update(spec.update)
  const filtered = target.everyRow
    ? base.neq(target.column, target.value)
    : base.eq(target.column, target.value)
  // .select() returns the changed rows: an update that RLS filters out gives no error, 0 rows.
  const { data, error, status } = await filtered.select(spec.key)
  if (error) return judgeRefusal(check, error, status)
  const changed = (data ?? []).length
  if (changed === 0) {
    return report(
      check,
      true,
      `no error, but 0 rows changed (row-level security)${emptyNote(target)}`,
    )
  }
  let restored = false
  if (original && 'watch' in spec) {
    const { data: restoredRows } = await supabase
      .from(spec.table)
      .update({ [spec.watch]: original[spec.watch] })
      .eq(target.column, target.value)
      .select(spec.key)
    restored = (restoredRows ?? []).length > 0
  }
  return report(
    check,
    false,
    `ALLOWED: a visitor changed ${plural(changed, 'row')}! ${
      restored ? 'The old value was put back.' : 'Check the data by hand.'
    }`,
  )
}

async function attemptDelete(
  spec: TableSpec | AdminsSpec,
  target: Target,
  safeToTry: boolean,
): Promise<boolean> {
  const check = `${spec.table}: delete`
  if (!safeToTry) {
    // Security is already broken for this table; don't risk deleting a real row to prove it.
    return report(
      check,
      false,
      'not tried: insert or update was not refused, so security is broken here',
    )
  }
  const base = supabase.from(spec.table).delete()
  const filtered = target.everyRow
    ? base.neq(target.column, target.value)
    : base.eq(target.column, target.value)
  const { data, error, status } = await filtered.select(spec.key)
  if (error) return judgeRefusal(check, error, status)
  const deleted = (data ?? []).length
  if (deleted === 0) {
    return report(
      check,
      true,
      `no error, but 0 rows deleted (row-level security)${emptyNote(target)}`,
    )
  }
  const advice =
    spec.table === 'admins'
      ? 'Add yourself back as admin with the SQL from PLAN §4.'
      : 'Restore it from a backup or the seed.'
  return report(check, false, `ALLOWED: a visitor deleted ${plural(deleted, 'row')}! ${advice}`)
}

/** Re-reads the table after the attempts: same number of rows, same value in the target row. */
async function confirmUnchanged(spec: TableSpec, before: Snapshot): Promise<void> {
  const check = `${spec.table}: unchanged`
  const counted = await supabase.from(spec.table).select(spec.key, { count: 'exact' }).limit(1)
  if (counted.error) {
    report(check, false, `could not re-read: ${describe(counted.error, counted.status)}`)
    return
  }
  const problems: string[] = []
  const count = counted.count ?? 0
  if (count !== before.count) problems.push(`row count went from ${before.count} to ${count}`)

  if (before.target) {
    const { data, error, status } = await supabase
      .from(spec.table)
      .select('*')
      .eq(spec.key, String(before.target[spec.key]))
      .maybeSingle()
    if (error) {
      report(check, false, `could not re-read: ${describe(error, status)}`)
      return
    }
    const after = data as Row | null
    if (!after) problems.push('the targeted row is gone')
    else if (JSON.stringify(after[spec.watch]) !== JSON.stringify(before.target[spec.watch])) {
      problems.push(`${spec.watch} of the targeted row changed`)
    }
  }

  if (problems.length > 0) report(check, false, problems.join('; '))
  else {
    report(
      check,
      true,
      before.target
        ? `still ${plural(count, 'row')}, ${spec.watch} of the targeted row unchanged`
        : `still ${plural(count, 'row')}`,
    )
  }
}

// admins can't be read by visitors at all, so it has no snapshot or "unchanged" re-read.
type AdminsSpec = { table: 'admins'; key: 'user_id'; update: Row }
const ADMINS: AdminsSpec = { table: 'admins', key: 'user_id', update: { created_at: DUMMY_TIME } }

async function checkAdminsRead(): Promise<void> {
  const check = 'read admins (must stay hidden)'
  const { data, error, status } = await supabase.from('admins').select('*')
  // Visitors have no permission on admins at all, so the only good answer is a 42501 refusal.
  // "0 rows, no error" would mean they CAN query it and it merely looks empty (it usually is
  // empty until Phase 5, so that would prove nothing).
  if (error) {
    judgeRefusal(check, error, status)
    return
  }
  const rows = (data ?? []).length
  report(
    check,
    false,
    rows === 0
      ? 'visitors are allowed to query admins (it only looks empty): they should get "permission denied"'
      : `visitors can see ${plural(rows, 'admin row')}!`,
  )
}

async function attemptAdminsWrites(): Promise<void> {
  // A made-up user id: if security failed, this would be a foreign-key error, still a FAIL.
  const fakeUserId = randomUUID()
  const insertCheck = 'admins: insert'
  let insertRefused: boolean
  const { error, status } = await supabase.from('admins').insert({ user_id: fakeUserId })
  if (error) insertRefused = judgeRefusal(insertCheck, error, status)
  else {
    const { data } = await supabase
      .from('admins')
      .delete()
      .eq('user_id', fakeUserId)
      .select('user_id')
    insertRefused = report(
      insertCheck,
      false,
      `ALLOWED: a visitor added an admin row! ${
        (data ?? []).length > 0 ? 'It was removed again.' : `Delete user_id ${fakeUserId} by hand.`
      }`,
    )
  }
  // Aim at every admin row: the realistic attack.
  const everyAdmin: Target = {
    column: 'user_id',
    value: ZERO_UUID,
    everyRow: true,
    emptyTable: false,
  }
  const updateRefused = await attemptUpdate(ADMINS, everyAdmin, null)
  await attemptDelete(ADMINS, everyAdmin, insertRefused && updateRefused)
}

// ── Functions ─────────────────────────────────────────────────────────────────────────────────

async function checkIsAdmin(): Promise<void> {
  const check = 'rpc is_admin (visitors are never admin)'
  // Only logged-in users may call is_admin(), so a visitor should be refused (42501).
  // "false" is also safe (just not how the migrations set it up).
  const { data, error, status } = await supabase.rpc('is_admin')
  if (error) judgeRefusal(check, error, status)
  else if (data === false) report(check, true, 'returned false')
  else report(check, false, `expected a refusal for a visitor, got ${JSON.stringify(data)}`)
}

async function checkSearch(): Promise<void> {
  const { data, error, status } = await supabase.rpc('search_site', { q: 'sample' })
  if (error) report('rpc search_site', false, describe(error, status))
  else if (!Array.isArray(data)) report('rpc search_site', false, 'did not return a list')
  else report('rpc search_site', true, `${plural(data.length, 'result')} for "sample"`)
}

async function attemptMoveLevel(level: Row | null): Promise<void> {
  const check = 'rpc admin_move_level'
  // Asks to keep the level where it already is, so even if security failed nothing would move.
  const args = level
    ? { p_level_id: String(level.id), p_new_position: Number(level.position) }
    : { p_level_id: randomUUID(), p_new_position: 1 }
  const { error, status } = await supabase.rpc('admin_move_level', args)
  if (error) judgeRefusal(check, error, status)
  else report(check, false, 'ALLOWED: a visitor could call it! (It kept the level in place.)')
}

async function attemptCreateLevel(level: Row | null): Promise<void> {
  const check = 'rpc admin_create_level'
  const { error, status } = await supabase.rpc('admin_create_level', {
    p_name: DUMMY,
    p_slug: DUMMY,
    p_position: Number(level?.position ?? 0) + 1,
    p_creator: 'RLS check',
    p_difficulty: 'extreme_demon',
  })
  if (error) {
    judgeRefusal(check, error, status)
    return
  }
  const { data } = await supabase.from('levels').delete().eq('slug', DUMMY).select('id')
  report(
    check,
    false,
    `ALLOWED: a visitor created a level! ${
      (data ?? []).length > 0
        ? 'It was removed again.'
        : `Delete the level with slug '${DUMMY}' by hand.`
    }`,
  )
}

async function attemptDeleteLevel(): Promise<void> {
  const check = 'rpc admin_delete_level'
  // Aimed at a level id that doesn't exist, so even if security failed nothing would be deleted.
  const { error, status } = await supabase.rpc('admin_delete_level', { p_level_id: randomUUID() })
  if (error) judgeRefusal(check, error, status)
  else {
    report(
      check,
      false,
      'ALLOWED: a visitor could call it! (It was aimed at a level that does not exist, so nothing was deleted.)',
    )
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────────────────────

type StorageProblem = { message: string; status?: number; statusCode?: string }

function storageStatus(error: StorageProblem): number {
  return Number(error.statusCode) || error.status || 0
}

async function attemptUpload(): Promise<void> {
  const check = 'storage: upload to media'
  const path = `levels/rls-check/${Date.now()}.png`
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, TINY_PNG, { contentType: 'image/png', upsert: false })
  if (error) {
    const status = storageStatus(error)
    const message = oneLine(error.message || 'unknown error')
    const code = status ? ` (${status})` : ''
    if (/bucket not found/i.test(error.message)) {
      report(check, false, "the 'media' bucket doesn't exist: have the migrations been applied?")
    } else if (STORAGE_REFUSAL.test(error.message)) {
      // Only a row-level-security / permission answer proves the security rules said no. A bare
      // 401/403 can also mean "Storage didn't accept the key", which proves nothing.
      report(check, true, `refused: ${message}${code}`)
    } else if (!status) {
      report(check, false, `could not check — network error: ${message}`)
    } else {
      report(
        check,
        false,
        `could not check: Storage refused for another reason, so this proves nothing: ${message}${code}`,
      )
    }
    return
  }
  // remove() answers with the files it really deleted (an empty list if RLS stopped it).
  const { data: removed } = await supabase.storage.from('media').remove([data.path])
  report(
    check,
    false,
    `ALLOWED: a visitor uploaded a file! ${
      (removed ?? []).length > 0 ? 'It was removed again.' : `Delete media/${data.path} by hand.`
    }`,
  )
}

/** Folders that must hold uploaded images: the folders of thumbnail/avatar paths in the data. */
async function knownMediaFolders(): Promise<string[]> {
  const folders = new Set<string>()
  const sources = [
    { table: 'levels', column: 'thumbnail_path' },
    { table: 'players', column: 'avatar_path' },
  ]
  for (const { table, column } of sources) {
    const { data } = await supabase.from(table).select('*').not(column, 'is', null).limit(1)
    const path = ((data ?? []) as Row[])[0]?.[column]
    if (typeof path === 'string' && path.includes('/')) {
      folders.add(path.slice(0, path.lastIndexOf('/')))
    }
  }
  return [...folders]
}

async function checkListing(): Promise<void> {
  const check = 'storage: list media files'
  const known = await knownMediaFolders()
  let listed = 0
  for (const folder of ['', ...known]) {
    const { data, error } = await supabase.storage.from('media').list(folder, { limit: 100 })
    if (error) {
      const message = oneLine(error.message || 'unknown error')
      if (!storageStatus(error)) {
        report(check, false, `could not check — network error: ${message}`)
      } else if (/bucket not found/i.test(error.message)) {
        // Visitors can't see the bucket's settings row, so Storage may answer like this.
        report(check, true, 'refused (visitors cannot even see the bucket)')
      } else if (STORAGE_REFUSAL.test(error.message)) {
        report(check, true, `refused: ${message}`)
      } else {
        report(check, false, `could not check: ${message}`)
      }
      return
    }
    listed += data.length
  }
  if (listed > 0) {
    report(
      check,
      false,
      `visitors can list ${plural(listed, 'entry')}: anyone could browse every upload`,
    )
  } else if (known.length > 0) {
    report(check, true, 'nothing listed, although the data points at uploaded images')
  } else {
    // Without any uploaded image, "nothing listed" looks the same whether or not visitors may list.
    note(
      check,
      'nothing listed, but no images are uploaded yet, so this proves nothing: run again after uploading images (Phase 5)',
    )
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────────────────────

/** One cheap request first, so a wrong URL/key or a network problem gives one clear message. */
async function connect(): Promise<boolean> {
  const check = 'reach Supabase'
  const { error, status } = await supabase.from('site_settings').select('id').limit(1)
  if (!error) return report(check, true, 'connected as a logged-out visitor')
  if (status === 0) {
    report(check, false, describeNetwork(error))
    return false
  }
  if (/api ?key/i.test(error.message) || (status === 401 && !error.code)) {
    report(
      check,
      false,
      'Supabase refused the key: check VITE_SUPABASE_PUBLISHABLE_KEY in .env.local',
    )
    return false
  }
  if (error.code && NOT_FOUND_CODES.has(error.code)) {
    report(
      check,
      false,
      'the tables were not found: apply the migrations first, then run this again',
    )
    return false
  }
  // Some other answer: carry on, the detailed checks below will show what's wrong.
  return report(
    check,
    true,
    `connected (but reading site_settings said: ${describe(error, status)})`,
  )
}

async function main(): Promise<void> {
  currentGroup = 'Connection'
  if (!(await connect())) return

  currentGroup = 'Reading — must work'
  const snapshots = new Map<string, Snapshot>()
  for (const spec of PUBLIC_TABLES) {
    const snapshot = await checkRead(spec)
    if (snapshot) snapshots.set(spec.table, snapshot)
  }
  for (const view of VIEWS) await checkViewRead(view)
  await checkSearch()

  currentGroup = 'Hidden from visitors'
  await checkAdminsRead()
  await checkIsAdmin()
  await checkListing()

  currentGroup = 'Writing — must be refused'
  for (const spec of PUBLIC_TABLES) {
    const before = snapshots.get(spec.table) ?? null
    const target: Target = {
      column: spec.key,
      value: before?.target ? String(before.target[spec.key]) : spec.fallbackKey,
      everyRow: false,
      emptyTable: before !== null && !before.target,
    }
    const insertRefused = await attemptInsert(spec, spec.insert(snapshots))
    const updateRefused = await attemptUpdate(spec, target, before?.target ?? null)
    await attemptDelete(spec, target, insertRefused && updateRefused)
    if (before) await confirmUnchanged(spec, before)
  }
  await attemptAdminsWrites()

  currentGroup = 'Admin functions — must be refused'
  const lastLevel = snapshots.get('levels')?.target ?? null
  await attemptMoveLevel(lastLevel)
  await attemptCreateLevel(lastLevel)
  await attemptDeleteLevel()

  currentGroup = 'Storage — must be refused'
  await attemptUpload()
}

function printTable(): void {
  const width = Math.max('Check'.length, ...results.map((result) => result.check.length))
  console.log('\nQwerty Crate RLS check (as a logged-out visitor, with the publishable key)\n')
  console.log(`  ${'Check'.padEnd(width)}  Result  Detail`)
  console.log(`  ${'─'.repeat(width)}  ──────  ${'─'.repeat(40)}`)
  const labels: Record<Status, string> = {
    PASS: styleText('green', 'PASS'),
    FAIL: styleText(['red', 'bold'], 'FAIL'),
    NOTE: styleText('yellow', 'NOTE'),
  }
  let group = ''
  for (const result of results) {
    if (result.group !== group) {
      group = result.group
      console.log(`  ${styleText('bold', group)}`)
    }
    console.log(`  ${result.check.padEnd(width)}  ${labels[result.status]}    ${result.detail}`)
  }

  const count = (status: Status) => results.filter((result) => result.status === status).length
  const failed = count('FAIL')
  const notes = count('NOTE')
  const noteLine =
    notes > 0
      ? `\n  ${plural(notes, 'check')} could not be proven with the current data (NOTE rows above).`
      : ''
  if (failed === 0) {
    console.log(
      `\n✔ All ${count('PASS')} tested checks passed: visitors can read the public data and can't change anything.${noteLine}\n`,
    )
  } else {
    console.log(
      `\n✖ ${failed} of ${results.length} checks FAILED (see the table above).${noteLine}\n`,
    )
    process.exitCode = 1
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    report('run the checks', false, `stopped unexpectedly: ${oneLine(message, 200)}`)
  })
  .finally(printTable)
