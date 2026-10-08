import { describe, expect, it } from 'vitest'
import {
  getYouTubeId,
  isYouTubeId,
  youtubeEmbedUrl,
  youtubeThumb,
  youtubeWatchUrl,
} from '../lib/youtube'

const ID = 'dQw4w9WgXcQ'
const ID2 = 'a-B_c1D2e3F'

describe('getYouTubeId — accepted links', () => {
  it.each([
    ['watch?v=', `https://www.youtube.com/watch?v=${ID}`],
    ['watch without www.', `https://youtube.com/watch?v=${ID}`],
    ['plain http', `http://www.youtube.com/watch?v=${ID}`],
    ['the mobile site', `https://m.youtube.com/watch?v=${ID}`],
    ['YouTube Music', `https://music.youtube.com/watch?v=${ID}`],
    ['a start time', `https://www.youtube.com/watch?v=${ID}&t=42s`],
    ['a playlist and index', `https://www.youtube.com/watch?v=${ID}&list=PL1234567890&index=3`],
    ['v= after other parameters', `https://www.youtube.com/watch?feature=share&v=${ID}`],
    ['a #hash', `https://www.youtube.com/watch?v=${ID}#comments`],
    ['a trailing slash after watch', `https://www.youtube.com/watch/?v=${ID}`],
    ['youtu.be', `https://youtu.be/${ID}`],
    ['youtu.be with ?si=', `https://youtu.be/${ID}?si=AbCdEfGhIjKlMnOp`],
    ['youtu.be with ?t=', `http://youtu.be/${ID}?t=42`],
    ['youtu.be with a trailing slash', `https://youtu.be/${ID}/`],
    ['/shorts/', `https://www.youtube.com/shorts/${ID}`],
    ['/shorts/ with ?feature=share', `https://youtube.com/shorts/${ID}?feature=share`],
    ['/shorts/ on the mobile site', `https://m.youtube.com/shorts/${ID}`],
    ['/embed/', `https://www.youtube.com/embed/${ID}`],
    ['/embed/ with ?start=', `https://www.youtube.com/embed/${ID}?start=10&rel=0`],
    ['/live/', `https://www.youtube.com/live/${ID}?si=xyz`],
    ['/v/', `https://www.youtube.com/v/${ID}`],
    ['youtube-nocookie.com', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['youtube-nocookie.com without www.', `https://youtube-nocookie.com/embed/${ID}`],
    ['trailing slashes', `https://www.youtube.com/shorts/${ID}//`],
    ['upper-case host', `HTTPS://WWW.YOUTUBE.COM/watch?v=${ID}`],
    ['surrounding spaces', `  https://youtu.be/${ID}  `],
    ['the default https port', `https://www.youtube.com:443/watch?v=${ID}`],
  ])('reads the ID from %s', (_label, url) => {
    expect(getYouTubeId(url)).toBe(ID)
  })

  it('keeps the exact letters, digits, - and _ of the ID', () => {
    expect(getYouTubeId(`https://youtu.be/${ID2}`)).toBe(ID2)
    expect(getYouTubeId(`https://www.youtube.com/watch?v=${ID2}`)).toBe(ID2)
  })

  it('takes the first v= when there are several', () => {
    expect(getYouTubeId(`https://www.youtube.com/watch?v=${ID}&v=${ID2}`)).toBe(ID)
  })
})

describe('getYouTubeId — rejected input', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['spaces', '   '],
    ['plain text', 'not a url'],
    ['a bare ID', ID],
  ])('returns null for %s', (_label, value) => {
    expect(getYouTubeId(value)).toBeNull()
  })

  it.each([
    ['no scheme', `youtube.com/watch?v=${ID}`],
    ['no scheme, with www.', `www.youtube.com/watch?v=${ID}`],
    ['protocol-relative', `//www.youtube.com/watch?v=${ID}`],
    ['a path only', `/watch?v=${ID}`],
    ['a youtu.be path only', `youtu.be/${ID}`],
  ])('returns null for relative links (%s)', (_label, url) => {
    expect(getYouTubeId(url)).toBeNull()
  })

  it.each([
    ['javascript:', `javascript:alert('https://youtu.be/${ID}')`],
    ['javascript: with a newline', `java\nscript:alert(1)//https://youtu.be/${ID}`],
    ['data:', `data:text/html,https://youtu.be/${ID}`],
    ['ftp:', `ftp://www.youtube.com/watch?v=${ID}`],
    ['file:', `file:///youtube.com/watch?v=${ID}`],
  ])('returns null for other schemes (%s)', (_label, url) => {
    expect(getYouTubeId(url)).toBeNull()
  })

  it.each([
    ['a look-alike suffix', `https://youtube.com.evil.example/watch?v=${ID}`],
    ['a look-alike prefix', `https://evilyoutube.com/watch?v=${ID}`],
    ['a fake subdomain', `https://www.youtube.evil.example/watch?v=${ID}`],
    ['youtu.be look-alike', `https://notyoutu.be/${ID}`],
    ['youtu.be as a subdomain', `https://youtu.be.evil.example/${ID}`],
    ['youtu.be with www.', `https://www.youtu.be/${ID}`],
    ['nocookie look-alike', `https://youtube-nocookie.com.evil.example/embed/${ID}`],
    ['YouTube in the path', `https://evil.example/youtube.com/watch?v=${ID}`],
    ['YouTube in the query', `https://evil.example/?u=https://youtu.be/${ID}`],
    ['another site with ?v=', `https://evil.example/watch?v=${ID}`],
    ['a user name hiding the host', `https://www.youtube.com@evil.example/watch?v=${ID}`],
    ['a backslash hiding the host', `https://evil.example\\@www.youtube.com/watch?v=${ID}`],
    ['a Cyrillic look-alike host', `https://www.yоutube.com/watch?v=${ID}`],
    ['a user name on YouTube', `https://user:pw@www.youtube.com/watch?v=${ID}`],
    ['an unusual port', `https://www.youtube.com:8080/watch?v=${ID}`],
    ['another YouTube host', `https://studio.youtube.com/video/${ID}/edit`],
    ['an image host', `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`],
  ])('returns null for other hosts (%s)', (_label, url) => {
    expect(getYouTubeId(url)).toBeNull()
  })

  it.each([
    ['a channel page', 'https://www.youtube.com/@SomeChannel'],
    ['a playlist', 'https://www.youtube.com/playlist?list=PL1234567890'],
    ['the home page', 'https://www.youtube.com/'],
    ['watch with no v=', 'https://www.youtube.com/watch'],
    ['watch with an empty v=', 'https://www.youtube.com/watch?v='],
    ['v= on a non-watch page', `https://www.youtube.com/results?v=${ID}`],
    ['youtu.be with no ID', 'https://youtu.be/'],
    ['shorts with no ID', 'https://www.youtube.com/shorts/'],
    ['an ID under an unknown prefix', `https://www.youtube.com/clip/${ID}`],
    ['an extra path part', `https://www.youtube.com/embed/${ID}/extra`],
    ['an extra youtu.be path part', `https://youtu.be/${ID}/extra`],
    ['an upper-case prefix', `https://www.youtube.com/SHORTS/${ID}`],
    ['nocookie without /embed/', `https://www.youtube-nocookie.com/watch?v=${ID}`],
    ['an empty segment before the ID', `https://www.youtube.com/embed//${ID}`],
  ])('returns null for links that are not a single video (%s)', (_label, url) => {
    expect(getYouTubeId(url)).toBeNull()
  })

  it.each([
    ['too short', 'dQw4w9WgXc'],
    ['too long', 'dQw4w9WgXcQQ'],
    ['a bad character', 'dQw4w9WgX.Q'],
    ['an angle bracket', 'dQw4w9Wg<Q>'],
    ['a quote', `dQw4w9WgX"Q`],
    ['a space', 'dQw4w9 WgXQ'],
    ['percent-encoding', 'dQw4w9WgX%51'],
  ])('returns null when the ID is %s', (_label, id) => {
    expect(getYouTubeId(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`)).toBeNull()
    expect(getYouTubeId(`https://youtu.be/${id}`)).toBeNull()
    expect(getYouTubeId(`https://www.youtube.com/embed/${id}`)).toBeNull()
  })
})

describe('getYouTubeId — very long links', () => {
  // Thumbnails are worked out while a page renders, so a stored link must never freeze it.
  it('answers quickly for a path made of many slashes', () => {
    const slashes = '/'.repeat(100_000)
    const start = performance.now()
    expect(getYouTubeId(`https://youtu.be/${slashes}${ID}`)).toBeNull()
    expect(getYouTubeId(`https://www.youtube.com/shorts${slashes}${ID}`)).toBeNull()
    expect(getYouTubeId(`https://youtu.be/${ID}${slashes}`)).toBe(ID)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('isYouTubeId', () => {
  it('accepts exactly 11 letters, digits, - or _', () => {
    expect(isYouTubeId(ID)).toBe(true)
    expect(isYouTubeId(ID2)).toBe(true)
    expect(isYouTubeId('___________')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isYouTubeId('')).toBe(false)
    expect(isYouTubeId('dQw4w9WgXc')).toBe(false)
    expect(isYouTubeId(`${ID}\n`)).toBe(false)
    expect(isYouTubeId('dQw4w9WgX/Q')).toBe(false)
    expect(isYouTubeId(null)).toBe(false)
    expect(isYouTubeId(12345678901)).toBe(false)
  })
})

describe('URL builders', () => {
  it('builds the no-cookie embed URL', () => {
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
    expect(youtubeEmbedUrl(ID2)).toBe(`https://www.youtube-nocookie.com/embed/${ID2}`)
  })

  it('builds the thumbnail URL', () => {
    expect(youtubeThumb(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  })

  it('builds the watch URL', () => {
    expect(youtubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })

  it('works on the output of getYouTubeId', () => {
    const id = getYouTubeId(`https://youtu.be/${ID}?t=5`)
    expect(id && youtubeEmbedUrl(id)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
  })

  it.each([
    ['an empty string', ''],
    ['a full URL', `https://youtu.be/${ID}`],
    ['a path trick', `../../${ID}`],
    ['a query trick', `${ID}?autoplay=1`],
    ['an ID with a quote', `dQw4w9WgX"Q`],
    ['a 12-character ID', `${ID}Q`],
  ])('returns null instead of a URL for %s', (_label, bad) => {
    expect(youtubeEmbedUrl(bad)).toBeNull()
    expect(youtubeThumb(bad)).toBeNull()
    expect(youtubeWatchUrl(bad)).toBeNull()
  })
})
