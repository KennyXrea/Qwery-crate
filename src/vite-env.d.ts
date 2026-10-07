// Types for the VITE_ variables the app reads (see src/lib/env.ts). Only these two may ever be
// read in browser code; both are optional here because env.ts validates them at startup.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
