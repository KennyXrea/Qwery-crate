import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { getEnv } from './env'

/**
 * The one Supabase client the whole site uses, typed with the generated database types.
 *
 * Only code in src/api/ may import it (pages and components call the functions there).
 * It uses the PUBLISHABLE key: everything it can do is limited by row level security in
 * Postgres. The auth options are Supabase's defaults on purpose: the admin's login session is
 * saved in the browser and refreshed automatically (Phase 5 relies on that).
 *
 * main.tsx only loads the app after the environment variables passed validation, so getEnv()
 * cannot throw here when the site runs. Tests replace this module with a fake.
 */
const env = getEnv()

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey)

export type AppSupabaseClient = typeof supabase
