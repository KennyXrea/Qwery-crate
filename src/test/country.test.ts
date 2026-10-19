import { describe, expect, it } from 'vitest'
import { countryFlagEmoji, countryName, normalizeCountryCode } from '../lib/country'

describe('country helpers', () => {
  it('turns a 2-letter code into regional indicator symbols', () => {
    expect(countryFlagEmoji('US')).toBe('\u{1F1FA}\u{1F1F8}')
    expect(countryFlagEmoji('se')).toBe('\u{1F1F8}\u{1F1EA}')
    expect(countryFlagEmoji(' de ')).toBe('\u{1F1E9}\u{1F1EA}')
  })

  it('names the country in English', () => {
    expect(countryName('US')).toBe('United States')
    expect(countryName('kr')).toBe('South Korea')
  })

  it('maps UK to the GB flag', () => {
    expect(normalizeCountryCode('uk')).toBe('GB')
    expect(countryFlagEmoji('UK')).toBe('\u{1F1EC}\u{1F1E7}')
    expect(countryName('UK')).toBe('United Kingdom')
  })

  it.each([null, undefined, '', '  ', 'U', 'USA', '1A', 'U$', 'XX', 'ZZ', 'ÜS'])(
    'rejects %j',
    (code) => {
      expect(normalizeCountryCode(code)).toBeNull()
      expect(countryFlagEmoji(code)).toBeNull()
      expect(countryName(code)).toBeNull()
    },
  )
})
