import { describe, expect, it } from 'vitest'
import { hostLabel, parseExternalUrl, safeExternalUrl } from '../lib/url'

describe('safeExternalUrl', () => {
  it.each([
    ['https://example.com/page', 'https://example.com/page'],
    ['http://example.com/page?x=1#top', 'http://example.com/page?x=1#top'],
    ['https://www.youtube.com/@SomeChannel', 'https://www.youtube.com/@SomeChannel'],
    ['https://www.twitch.tv/somebody', 'https://www.twitch.tv/somebody'],
    ['https://example.com:8443/a', 'https://example.com:8443/a'],
  ])('keeps the http(s) link %s', (input, expected) => {
    expect(safeExternalUrl(input)).toBe(expected)
  })

  it('returns the browser-normalised form', () => {
    expect(safeExternalUrl('HTTPS://Example.COM')).toBe('https://example.com/')
    expect(safeExternalUrl('  https://example.com/a b  ')).toBe('https://example.com/a%20b')
    expect(safeExternalUrl('https://example.com:443/x')).toBe('https://example.com/x')
    expect(safeExternalUrl('https://bücher.example/')).toBe('https://xn--bcher-kva.example/')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['spaces', '   '],
    ['plain text', 'hello there'],
  ])('returns null for %s', (_label, value) => {
    expect(safeExternalUrl(value)).toBeNull()
  })

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['JavaScript: in mixed case', 'JaVaScRiPt:alert(1)'],
    ['javascript: with leading spaces', '   javascript:alert(1)'],
    ['javascript: split by a newline', 'java\nscript:alert(1)'],
    ['javascript: split by a tab', 'java\tscript:alert(1)'],
    ['javascript: hiding an http link', 'javascript://https://example.com/%0aalert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript:', 'vbscript:msgbox(1)'],
    ['file:', 'file:///etc/passwd'],
    ['ftp:', 'ftp://example.com/file'],
    ['mailto:', 'mailto:someone@example.com'],
    ['blob:', 'blob:https://example.com/1234'],
  ])('returns null for %s links', (_label, value) => {
    expect(safeExternalUrl(value)).toBeNull()
  })

  it.each([
    ['a domain without a scheme', 'example.com'],
    ['www. without a scheme', 'www.example.com/page'],
    ['a path', '/admin'],
    ['a relative path', '../secret'],
    ['protocol-relative', '//evil.example/'],
    ['a query', '?x=1'],
    ['a hash', '#top'],
  ])('returns null for relative links (%s)', (_label, value) => {
    expect(safeExternalUrl(value)).toBeNull()
  })

  it.each([
    ['a user name', 'https://www.youtube.com@evil.example/'],
    ['a user name and password', 'https://user:pass@example.com/'],
  ])('returns null for links with %s', (_label, value) => {
    expect(safeExternalUrl(value)).toBeNull()
  })

  it('returns null for an http link with no host', () => {
    expect(safeExternalUrl('http://')).toBeNull()
    expect(safeExternalUrl('https:///')).toBeNull()
  })
})

describe('parseExternalUrl', () => {
  it('returns the parsed URL for a full http(s) link', () => {
    const parsed = parseExternalUrl('  https://www.example.com:8443/a?b=1#c  ')
    expect(parsed).toBeInstanceOf(URL)
    expect(parsed?.hostname).toBe('www.example.com')
    expect(parsed?.port).toBe('8443')
    expect(parsed?.searchParams.get('b')).toBe('1')
  })

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['a relative link', '/admin'],
    ['a javascript: link', 'javascript:alert(1)'],
    ['a link with a user name', 'https://user@example.com/'],
  ])('returns null for %s', (_label, value) => {
    expect(parseExternalUrl(value)).toBeNull()
  })
})

describe('hostLabel', () => {
  it('shows the host without www.', () => {
    expect(hostLabel('https://www.example.com/some/page?x=1')).toBe('example.com')
    expect(hostLabel('https://www.youtube.com/@SomeChannel')).toBe('youtube.com')
    expect(hostLabel('http://twitch.tv/somebody')).toBe('twitch.tv')
    expect(hostLabel('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('m.youtube.com')
  })

  it('lower-cases the host and keeps an unusual port', () => {
    expect(hostLabel('HTTPS://WWW.Example.COM')).toBe('example.com')
    expect(hostLabel('https://example.com:8443/')).toBe('example.com:8443')
    expect(hostLabel('https://example.com:443/')).toBe('example.com')
  })

  it('only strips a leading www.', () => {
    expect(hostLabel('https://wwwexample.com/')).toBe('wwwexample.com')
    expect(hostLabel('https://shop.www.example.com/')).toBe('shop.www.example.com')
  })

  it('never returns an empty or port-only label', () => {
    expect(hostLabel('https://www./')).toBe('www.')
    expect(hostLabel('https://WWW./')).toBe('www.')
    expect(hostLabel('https://www.:8080/')).toBe('www.:8080')
    expect(hostLabel('https://www../')).toBe('www..')
    expect(hostLabel('https://www/')).toBe('www')
  })

  it('shows international domains in ASCII form', () => {
    expect(hostLabel('https://www.yоutube.com/')).toMatch(/^xn--/)
  })

  it('returns null whenever safeExternalUrl would', () => {
    for (const bad of [null, '', 'javascript:alert(1)', 'example.com', 'https://a@evil.example/']) {
      expect(hostLabel(bad)).toBeNull()
    }
  })
})
