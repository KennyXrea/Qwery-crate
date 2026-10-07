/**
 * Turns a URL slug into a readable name for placeholder headings:
 * "sample-level-1" → "Sample Level 1". Real pages show the name from the database instead.
 */
export function nameFromSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
