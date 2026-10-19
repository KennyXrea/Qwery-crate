/**
 * Country codes (players.country_code) → flag emoji and country name, for CountryFlag.
 * A flag emoji is just the two letters written as "regional indicator" symbols
 * (U+1F1E6 = A … U+1F1FF = Z): "US" → 🇺🇸. Nothing is downloaded, and no image is used.
 */

const TWO_LETTERS = /^[A-Za-z]{2}$/
const REGIONAL_INDICATOR_A = 0x1f1e6

/** Common codes people type that aren't the ISO code their flag uses. */
const ALIASES: Readonly<Record<string, string>> = { UK: 'GB' }

/** "Unknown Region": a real ISO code, but no country and no flag. */
const UNKNOWN_REGION = 'ZZ'

let regionNames: Intl.DisplayNames | null | undefined

function getRegionNames(): Intl.DisplayNames | null {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    } catch {
      // Very old browsers without Intl.DisplayNames: flags still work, names fall back to codes.
      regionNames = null
    }
  }
  return regionNames
}

/**
 * The upper-case code if it is two letters and a real region, otherwise null.
 * " us " → "US", "UK" → "GB"; "USA", "1A", "" and unknown pairs such as "XX" or "ZZ" → null.
 */
export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (typeof code !== 'string') return null
  const trimmed = code.trim()
  if (!TWO_LETTERS.test(trimmed)) return null
  const upper = ALIASES[trimmed.toUpperCase()] ?? trimmed.toUpperCase()
  if (upper === UNKNOWN_REGION) return null
  const names = getRegionNames()
  if (names) {
    let name: string | undefined
    try {
      name = names.of(upper)
    } catch {
      return null
    }
    // With fallback 'none', unknown regions give undefined (some engines echo the code).
    if (name === undefined || name === upper) return null
  }
  return upper
}

/** "US" → "🇺🇸" (two regional indicator symbols), or null for an invalid code. */
export function countryFlagEmoji(code: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(code)
  if (!normalized) return null
  return String.fromCodePoint(
    ...[...normalized].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65),
  )
}

/** "US" → "United States", or null for an invalid code. */
export function countryName(code: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(code)
  if (!normalized) return null
  return getRegionNames()?.of(normalized) ?? normalized
}
