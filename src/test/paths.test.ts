import { describe, expect, it } from 'vitest'
import { hashString } from '../lib/hash'
import { levelPath, playerPath, recentPath } from '../lib/paths'

describe('paths', () => {
  it('builds level and player addresses', () => {
    expect(levelPath('sample-level-1')).toBe('/level/sample-level-1')
    expect(playerPath('player-alpha')).toBe('/player/player-alpha')
  })

  it('keeps a strange slug inside its path segment', () => {
    expect(levelPath('a/../b?x')).toBe('/level/a%2F..%2Fb%3Fx')
  })

  it('builds the Recent changes filter addresses', () => {
    expect(recentPath()).toBe('/recent')
    expect(recentPath('record')).toBe('/recent?kind=record')
    expect(recentPath('level_moved')).toBe('/recent?kind=level_moved')
  })
})

describe('hashString', () => {
  it('is deterministic and spreads different inputs', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc')).not.toBe(hashString('abd'))
    expect(hashString('')).toBe(0x811c9dc5)
    const values = new Set(['a', 'b', 'c', 'd', 'e'].map(hashString))
    expect(values.size).toBe(5)
    for (const value of values) {
      expect(Number.isInteger(value) && value >= 0 && value < 2 ** 32).toBe(true)
    }
  })
})
