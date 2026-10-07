/**
 * True when an error means one of the site's files could not be downloaded: a network blip,
 * or an old file that no longer exists after a new deploy. Each browser words it differently.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    error.message,
  )
}

/** The plain-language message main.tsx shows when the app's code fails to start. */
export function describeStartupError(error: unknown): string {
  return isChunkLoadError(error)
    ? 'Part of the site could not be downloaded. Check your connection and reload the page.'
    : 'The site ran into an unexpected error while starting. Reloading may fix it. If it keeps happening, let the site owner know.'
}
