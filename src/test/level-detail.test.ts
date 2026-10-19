import { describe, expect, it } from 'vitest'
import {
  firstVictorTileSpan,
  groupPositionHistory,
  isEmbeddableVideo,
  listPathForSection,
  pickLevelVideo,
  positionChange,
  recordsCell,
  shiftRange,
} from '../components/level/level-detail'
import type { PositionHistoryEntry } from '../types/models'
import { TEST_MEDAL_URL, TEST_YOUTUBE_URL } from './api-mocks'

const NO_VIDEO = {
  showcase_video_url: null,
  first_victor_video_url: null,
  first_victor_name: null,
  first_victor_slug: null,
}

let seq = 0
function step(
  reason: PositionHistoryEntry['reason'],
  oldPosition: number | null,
  newPosition: number | null,
): PositionHistoryEntry {
  seq += 1
  return {
    id: `entry-${seq}`,
    level_id: 'level',
    reason,
    old_position: oldPosition,
    new_position: newPosition,
    changed_at: '2026-09-01T12:00:00+00:00',
    seq,
  }
}

describe('pickLevelVideo', () => {
  it('prefers the showcase video', () => {
    expect(
      pickLevelVideo({
        ...NO_VIDEO,
        showcase_video_url: TEST_MEDAL_URL,
        first_victor_video_url: TEST_YOUTUBE_URL,
      }),
    ).toEqual({ source: 'showcase', url: TEST_MEDAL_URL })
  })

  it("falls back to the first victor's video, with who it is", () => {
    expect(
      pickLevelVideo({
        ...NO_VIDEO,
        first_victor_video_url: TEST_YOUTUBE_URL,
        first_victor_name: 'Player Alpha',
        first_victor_slug: 'player-alpha',
      }),
    ).toEqual({
      source: 'first_victor',
      url: TEST_YOUTUBE_URL,
      playerName: 'Player Alpha',
      playerSlug: 'player-alpha',
    })
  })

  it('skips unsafe or empty links', () => {
    expect(
      pickLevelVideo({
        ...NO_VIDEO,
        showcase_video_url: 'javascript:alert(1)',
        first_victor_video_url: TEST_YOUTUBE_URL,
      })?.source,
    ).toBe('first_victor')
    expect(pickLevelVideo({ ...NO_VIDEO, showcase_video_url: '  ' })).toBeNull()
    expect(pickLevelVideo(NO_VIDEO)).toBeNull()
  })

  it('knows which videos play on the page (YouTube only)', () => {
    expect(isEmbeddableVideo({ source: 'showcase', url: TEST_YOUTUBE_URL })).toBe(true)
    expect(isEmbeddableVideo({ source: 'showcase', url: TEST_MEDAL_URL })).toBe(false)
    expect(isEmbeddableVideo(null)).toBe(false)
  })
})

describe('listPathForSection', () => {
  it("links to the level's section of the list", () => {
    expect(listPathForSection('main')).toBe('/list')
    expect(listPathForSection('extended')).toBe('/list?section=extended')
    expect(listPathForSection('legacy')).toBe('/list?section=legacy')
  })
})

describe('firstVictorTileSpan', () => {
  it('fills the last row of the stat grid', () => {
    // A whole row on phones either way; from sm (3 columns) 9 tiles make full rows…
    expect(firstVictorTileSpan(true)).toBe('col-span-2 sm:col-span-1')
    // …and with 8 tiles the last row has two columns left.
    expect(firstVictorTileSpan(false)).toBe('col-span-2')
  })
})

describe('recordsCell', () => {
  it('leaves empty cells out of the phone layout only', () => {
    expect(recordsCell()).toMatch(/^block /)
    expect(recordsCell(false)).toMatch(/^hidden /)
    expect(recordsCell(false)).toContain('md:table-cell')
  })
})

describe('positionChange', () => {
  it('says which way and how far a level moved', () => {
    expect(positionChange(7, 5)).toEqual({ direction: 'up', places: 2 })
    expect(positionChange(5, 9)).toEqual({ direction: 'down', places: 4 })
    expect(positionChange(3, 3)).toEqual({ direction: 'none', places: 0 })
    expect(positionChange(null, 3)).toEqual({ direction: 'none', places: 0 })
  })
})

describe('groupPositionHistory', () => {
  it('keeps steps apart and gathers consecutive shifts', () => {
    const moved = step('moved', 7, 5)
    const shiftA = step('shifted', 6, 7)
    const shiftB = step('shifted', 5, 6)
    const added = step('added', null, 5)
    const lone = step('shifted', 4, 5)

    expect(groupPositionHistory([moved, shiftA, shiftB, added, lone])).toEqual([
      { kind: 'step', entry: moved },
      { kind: 'shifts', entries: [shiftA, shiftB] },
      { kind: 'step', entry: added },
      { kind: 'shifts', entries: [lone] },
    ])
    expect(groupPositionHistory([])).toEqual([])
  })

  it('gives the overall range of a run of shifts (newest first)', () => {
    expect(shiftRange([step('shifted', 6, 7), step('shifted', 5, 6)])).toEqual({ from: 5, to: 7 })
    expect(shiftRange([])).toEqual({ from: null, to: null })
  })
})
