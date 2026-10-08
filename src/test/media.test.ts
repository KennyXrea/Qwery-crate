import { beforeEach, describe, expect, it, vi } from 'vitest'
import { levelThumbnail, MEDIA_BUCKET, playerAvatarUrl, publicMediaUrl } from '../lib/media'

// Replace the real env (which may hold the owner's real Supabase URL) with a fake one.
const { getEnv } = vi.hoisted(() => ({ getEnv: vi.fn() }))
vi.mock('../lib/env', () => ({ getEnv }))

const BASE = 'https://abcdefghijklmnopqrst.supabase.co'
const PUBLIC = `${BASE}/storage/v1/object/public/media`
const ENV_BASE = 'https://envprojectrefxxxxxxx.supabase.co'

const ID = 'dQw4w9WgXcQ'
const ID2 = 'a-B_c1D2e3F'
const THUMB = `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`
const THUMB2 = `https://i.ytimg.com/vi/${ID2}/hqdefault.jpg`

beforeEach(() => {
  getEnv.mockReset()
  getEnv.mockReturnValue({ supabaseUrl: ENV_BASE, supabasePublishableKey: 'sb_publishable_test' })
})

describe('publicMediaUrl', () => {
  it('builds the public Storage URL for a path', () => {
    expect(publicMediaUrl('levels/abc/123.webp', BASE)).toBe(`${PUBLIC}/levels/abc/123.webp`)
    expect(publicMediaUrl('avatar.png', BASE)).toBe(`${PUBLIC}/avatar.png`)
    expect(MEDIA_BUCKET).toBe('media')
  })

  it('ignores trailing slashes on the base URL', () => {
    expect(publicMediaUrl('a.webp', `${BASE}/`)).toBe(`${PUBLIC}/a.webp`)
    expect(publicMediaUrl('a.webp', `${BASE}///`)).toBe(`${PUBLIC}/a.webp`)
  })

  it('encodes each part of the path but keeps the slashes', () => {
    expect(publicMediaUrl('levels/my level/thumb #1.webp', BASE)).toBe(
      `${PUBLIC}/levels/my%20level/thumb%20%231.webp`,
    )
    expect(publicMediaUrl('a?b=c&d/é.png', BASE)).toBe(`${PUBLIC}/a%3Fb%3Dc%26d/%C3%A9.png`)
    // A literal % is part of the file name, so it is encoded too (no double-decoding tricks).
    expect(publicMediaUrl('levels/%2e%2e/x.webp', BASE)).toBe(`${PUBLIC}/levels/%252e%252e/x.webp`)
    expect(publicMediaUrl('a\\..\\b.png', BASE)).toBe(`${PUBLIC}/a%5C..%5Cb.png`)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['spaces', '   '],
  ])('returns null for %s', (_label, path) => {
    expect(publicMediaUrl(path, BASE)).toBeNull()
  })

  it.each([
    ['an https URL', 'https://evil.example/x.png'],
    ['an http URL', 'http://evil.example/x.png'],
    ['a protocol-relative URL', '//evil.example/x.png'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:image/png;base64,AAAA'],
  ])('returns null for %s', (_label, path) => {
    expect(publicMediaUrl(path, BASE)).toBeNull()
  })

  it.each([
    ['a leading ..', '../secret.png'],
    ['a .. in the middle', 'levels/../../other-bucket/x.png'],
    ['a trailing ..', 'levels/..'],
    ['a lone ..', '..'],
    ['a . segment', 'levels/./x.png'],
    ['a leading slash', '/levels/x.png'],
    ['a trailing slash', 'levels/'],
    ['an empty segment', 'levels//x.png'],
  ])('returns null for a path with %s', (_label, path) => {
    expect(publicMediaUrl(path, BASE)).toBeNull()
  })

  it('returns null instead of throwing for text that cannot be put in a URL', () => {
    // A lone half of a surrogate pair makes encodeURIComponent throw a URIError.
    expect(publicMediaUrl('levels/\uD800.png', BASE)).toBeNull()
    expect(publicMediaUrl('levels/abc/\uDC00', BASE)).toBeNull()
    // A complete pair (an emoji) is fine.
    expect(publicMediaUrl('levels/😀.png', BASE)).toBe(`${PUBLIC}/levels/%F0%9F%98%80.png`)
  })

  it('allows dots that are part of a name', () => {
    expect(publicMediaUrl('levels/..hidden/a..b.png', BASE)).toBe(
      `${PUBLIC}/levels/..hidden/a..b.png`,
    )
  })

  it('reads the Supabase URL from the env only when no base is given', () => {
    expect(publicMediaUrl('a.webp', BASE)).toBe(`${PUBLIC}/a.webp`)
    expect(publicMediaUrl(null)).toBeNull()
    expect(getEnv).not.toHaveBeenCalled()

    expect(publicMediaUrl('a.webp')).toBe(`${ENV_BASE}/storage/v1/object/public/media/a.webp`)
    expect(getEnv).toHaveBeenCalledTimes(1)
  })

  it('reads the env on every call, not once at import time', () => {
    getEnv.mockReturnValue({ supabaseUrl: BASE, supabasePublishableKey: 'sb_publishable_test' })
    expect(publicMediaUrl('a.webp')).toBe(`${PUBLIC}/a.webp`)
  })
})

describe('levelThumbnail', () => {
  const none = { thumbnail_path: null, showcase_video_url: null, first_victor_video_url: null }

  it('prefers the uploaded image', () => {
    expect(
      levelThumbnail(
        {
          thumbnail_path: 'levels/abc/1.webp',
          showcase_video_url: `https://youtu.be/${ID}`,
          first_victor_video_url: `https://youtu.be/${ID2}`,
        },
        BASE,
      ),
    ).toEqual({ kind: 'image', src: `${PUBLIC}/levels/abc/1.webp`, source: 'upload' })
  })

  it('falls back to the showcase video thumbnail', () => {
    expect(
      levelThumbnail(
        {
          ...none,
          showcase_video_url: `https://www.youtube.com/watch?v=${ID}&t=3s`,
          first_victor_video_url: `https://youtu.be/${ID2}`,
        },
        BASE,
      ),
    ).toEqual({ kind: 'image', src: THUMB, source: 'youtube' })
  })

  it("falls back to the first victor's video thumbnail", () => {
    expect(
      levelThumbnail({ ...none, first_victor_video_url: `https://youtu.be/${ID2}` }, BASE),
    ).toEqual({ kind: 'image', src: THUMB2, source: 'youtube' })
  })

  it('skips videos that are not on YouTube', () => {
    expect(
      levelThumbnail(
        {
          ...none,
          showcase_video_url: 'https://www.twitch.tv/videos/123456',
          first_victor_video_url: `https://youtu.be/${ID2}`,
        },
        BASE,
      ),
    ).toEqual({ kind: 'image', src: THUMB2, source: 'youtube' })

    expect(
      levelThumbnail(
        {
          ...none,
          showcase_video_url: 'https://streamable.com/abc',
          first_victor_video_url: 'https://evilyoutube.com/watch?v=' + ID,
        },
        BASE,
      ),
    ).toEqual({ kind: 'placeholder' })
  })

  it('skips an unusable uploaded path', () => {
    expect(
      levelThumbnail(
        { ...none, thumbnail_path: '../escape.png', showcase_video_url: `https://youtu.be/${ID}` },
        BASE,
      ),
    ).toEqual({ kind: 'image', src: THUMB, source: 'youtube' })
    expect(levelThumbnail({ ...none, thumbnail_path: '' }, BASE)).toEqual({ kind: 'placeholder' })
    expect(
      levelThumbnail(
        {
          ...none,
          thumbnail_path: 'levels/\uD800.png',
          showcase_video_url: `https://youtu.be/${ID}`,
        },
        BASE,
      ),
    ).toEqual({ kind: 'image', src: THUMB, source: 'youtube' })
  })

  it('returns the placeholder when there is nothing to show', () => {
    expect(levelThumbnail(none, BASE)).toEqual({ kind: 'placeholder' })
    expect(levelThumbnail({}, BASE)).toEqual({ kind: 'placeholder' })
    expect(
      levelThumbnail(
        { ...none, showcase_video_url: 'javascript:alert(1)', first_victor_video_url: '' },
        BASE,
      ),
    ).toEqual({ kind: 'placeholder' })
  })

  it('works with a row that has extra columns and no first victor field', () => {
    const levelRow = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Fake Level',
      thumbnail_path: null,
      showcase_video_url: `https://youtube.com/shorts/${ID}`,
    }
    expect(levelThumbnail(levelRow, BASE)).toEqual({ kind: 'image', src: THUMB, source: 'youtube' })
  })

  it('does not need the env unless there is an uploaded image', () => {
    expect(levelThumbnail({ ...none, showcase_video_url: `https://youtu.be/${ID}` })).toEqual({
      kind: 'image',
      src: THUMB,
      source: 'youtube',
    })
    expect(getEnv).not.toHaveBeenCalled()

    expect(levelThumbnail({ ...none, thumbnail_path: 'levels/x/1.webp' })).toEqual({
      kind: 'image',
      src: `${ENV_BASE}/storage/v1/object/public/media/levels/x/1.webp`,
      source: 'upload',
    })
  })
})

describe('playerAvatarUrl', () => {
  it('returns the public URL of the avatar', () => {
    expect(playerAvatarUrl({ avatar_path: 'players/p1/9.webp' }, BASE)).toBe(
      `${PUBLIC}/players/p1/9.webp`,
    )
    expect(playerAvatarUrl({ avatar_path: 'players/p1/9.webp' })).toBe(
      `${ENV_BASE}/storage/v1/object/public/media/players/p1/9.webp`,
    )
  })

  it('returns null when there is no usable avatar', () => {
    expect(playerAvatarUrl({ avatar_path: null }, BASE)).toBeNull()
    expect(playerAvatarUrl({}, BASE)).toBeNull()
    expect(playerAvatarUrl({ avatar_path: 'https://evil.example/a.png' }, BASE)).toBeNull()
    expect(playerAvatarUrl({ avatar_path: '../a.png' }, BASE)).toBeNull()
  })
})
