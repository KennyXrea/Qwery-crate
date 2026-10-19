/**
 * A small, fast, deterministic string hash (32-bit FNV-1a). Used only for looks — picking a
 * placeholder gradient or an avatar colour from an id — never for anything security related.
 * The same text always gives the same number, on every computer.
 */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
