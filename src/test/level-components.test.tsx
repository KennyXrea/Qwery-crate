import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DifficultyBadge } from '../components/level/DifficultyBadge'
import { LevelCard } from '../components/level/LevelCard'
import { LevelCardSkeleton } from '../components/level/LevelCardSkeleton'
import { LevelThumbnail } from '../components/level/LevelThumbnail'
import { placeholderScene, thumbnailSources } from '../components/level/level-visuals'
import { SectionBadge } from '../components/level/SectionBadge'
import { VideoEmbed } from '../components/level/VideoEmbed'
import { DIFFICULTIES, difficultyLabel, isDemon } from '../lib/format'
import { TEST_LEVELS, TEST_MEDAL_URL } from './api-mocks'
import { renderWithProviders } from './render'

// Uploaded images live in Supabase Storage; use a fixed fake project instead of .env.local.
vi.mock('../lib/env', () => ({
  getEnv: () => ({
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  }),
}))

const STORAGE = 'https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/media'
const SHOWCASE_ID = 'aaaaaaaaaaa'
const VICTOR_ID = 'bbbbbbbbbbb'
const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

const LEVEL = TEST_LEVELS[0]!

function thumbLevel(fields: Partial<Parameters<typeof thumbnailSources>[0]> = {}) {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Sample Level 1',
    thumbnail_path: null,
    showcase_video_url: null,
    first_victor_video_url: null,
    ...fields,
  }
}

describe('LevelThumbnail', () => {
  it('walks the fallback chain: upload → showcase video → first victor video → placeholder', () => {
    const level = thumbLevel({
      thumbnail_path: 'levels/abc/1.webp',
      showcase_video_url: `https://youtu.be/${SHOWCASE_ID}`,
      first_victor_video_url: `https://www.youtube.com/watch?v=${VICTOR_ID}&t=42s`,
    })
    const { container } = render(<LevelThumbnail level={level} />)

    const first = screen.getByRole('img', { name: 'Sample Level 1 thumbnail' })
    expect(first).toHaveAttribute('src', `${STORAGE}/levels/abc/1.webp`)
    expect(first).toHaveAttribute('loading', 'lazy')
    expect(first).toHaveAttribute('width', '480')
    expect(first).toHaveAttribute('height', '270')

    fireEvent.error(first)
    const second = screen.getByRole('img', { name: 'Sample Level 1 thumbnail' })
    expect(second).toHaveAttribute('src', ytThumb(SHOWCASE_ID))

    fireEvent.error(second)
    const third = screen.getByRole('img', { name: 'Sample Level 1 thumbnail' })
    expect(third).toHaveAttribute('src', ytThumb(VICTOR_ID))

    fireEvent.error(third)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // The level's own placeholder drawing (with its initials) is what's left.
    expect(container).toHaveTextContent('S1')
  })

  it('keeps a fixed 16:9 box with the placeholder underneath while the image loads', () => {
    const { container } = render(
      <LevelThumbnail
        level={thumbLevel({ showcase_video_url: `https://youtu.be/${SHOWCASE_ID}` })}
        className="w-48"
      />,
    )
    const box = container.firstElementChild as HTMLElement
    expect(box).toHaveClass('aspect-video', 'w-48')
    // Placeholder first, image on top of it.
    expect(box.children).toHaveLength(2)
    expect(box.children[0]).toHaveAttribute('aria-hidden', 'true')
    expect(box.children[1]?.tagName).toBe('IMG')
  })

  it('never uses a non-YouTube video as a thumbnail', () => {
    render(
      <LevelThumbnail
        level={thumbLevel({
          showcase_video_url: TEST_MEDAL_URL,
          first_victor_video_url: 'javascript:alert(1)',
        })}
      />,
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('can load eagerly for the picture at the top of a page', () => {
    render(
      <LevelThumbnail
        level={thumbLevel({ showcase_video_url: `https://youtu.be/${SHOWCASE_ID}` })}
        loading="eager"
      />,
    )
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
  })
})

describe('thumbnailSources / placeholderScene', () => {
  it('lists each usable picture once, best first', () => {
    expect(
      thumbnailSources(
        thumbLevel({
          showcase_video_url: `https://youtu.be/${SHOWCASE_ID}`,
          first_victor_video_url: `https://youtu.be/${SHOWCASE_ID}`,
        }),
      ),
    ).toEqual([ytThumb(SHOWCASE_ID)])
    expect(thumbnailSources(thumbLevel())).toEqual([])
  })

  it('gives each level its own deterministic placeholder', () => {
    expect(placeholderScene('level-a')).toEqual(placeholderScene('level-a'))
    const backgrounds = new Set(
      TEST_LEVELS.map((level) => JSON.stringify(placeholderScene(level.id))),
    )
    expect(backgrounds.size).toBe(TEST_LEVELS.length)
    // Only theme colours (CSS variables) are used.
    const { backgroundImage } = placeholderScene('level-a').background
    expect(String(backgroundImage)).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i)
    expect(String(backgroundImage)).toMatch(/var\(--color-/)
  })
})

describe('VideoEmbed', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
  ])('embeds %s with the privacy-friendly player', (url) => {
    const { container } = render(<VideoEmbed url={url} title="Sample Level 1 — showcase video" />)

    const frame = screen.getByTitle('Sample Level 1 — showcase video')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(frame).toHaveAttribute('loading', 'lazy')
    expect(frame).toHaveAttribute('allowfullscreen')
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    expect(container.firstElementChild).toHaveClass('aspect-video')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it.each([
    [TEST_MEDAL_URL, 'medal.tv'],
    ['https://www.twitch.tv/videos/123456', 'twitch.tv'],
    ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'youtube.com.evil.example'],
    ['https://www.youtube.com/watch?v=too-short', 'youtube.com'],
  ])('never embeds %s — it becomes a "Watch video" link instead', (url, host) => {
    const { container } = render(<VideoEmbed url={url} title="Video" />)

    expect(container.querySelector('iframe')).toBeNull()
    const link = screen.getByRole('link', { name: /watch video/i })
    expect(link).toHaveAttribute('href', new URL(url).href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName(/opens in a new tab/)
    expect(container).toHaveTextContent(host)
  })

  it.each([
    null,
    undefined,
    '',
    'javascript:alert(1)',
    'data:text/html,hi',
    '/relative',
    'ftp://x.y',
  ])('renders nothing for %j', (url) => {
    const { container } = render(<VideoEmbed url={url} title="Video" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DifficultyBadge', () => {
  it.each(DIFFICULTIES)('shows %s with its name and the right mark shape', (difficulty) => {
    const { container } = render(<DifficultyBadge difficulty={difficulty} />)
    const badge = container.firstElementChild as HTMLElement

    expect(badge).toHaveTextContent(difficultyLabel(difficulty))
    expect(badge).toHaveAttribute('data-demon', String(isDemon(difficulty)))
    // 5 marks: spikes (paths) for demons, round marks (circles) for the rest.
    expect(badge.querySelectorAll(isDemon(difficulty) ? 'path' : 'circle')).toHaveLength(5)
    expect(badge.querySelectorAll(isDemon(difficulty) ? 'circle' : 'path')).toHaveLength(0)
  })

  it('fills the meter by tier', () => {
    const filled = (difficulty: (typeof DIFFICULTIES)[number]) => {
      const { container, unmount } = render(<DifficultyBadge difficulty={difficulty} />)
      const count = container.querySelectorAll('[fill="currentColor"]').length
      unmount()
      return count
    }
    expect(filled('auto')).toBe(0)
    expect(filled('easy_demon')).toBe(1)
    expect(filled('extreme_demon')).toBe(5)
    expect(filled('insane')).toBe(5)
  })

  it('names the meter for screen readers when the words are hidden', () => {
    render(<DifficultyBadge difficulty="extreme_demon" hideLabel />)
    const meter = screen.getByRole('img', { name: 'Extreme Demon' })
    expect(meter).toHaveAttribute('title', 'Extreme Demon')
    expect(screen.queryByText('Extreme Demon')).not.toBeInTheDocument()
  })
})

describe('SectionBadge', () => {
  it.each([
    ['main', 'Main list'],
    ['extended', 'Extended list'],
    ['legacy', 'Legacy list'],
  ] as const)('labels %s', (section, text) => {
    const { container } = render(<SectionBadge section={section} />)
    expect(container).toHaveTextContent(text)
  })
})

describe('LevelCard', () => {
  it('shows rank, name, creator, difficulty, points, victors and enjoyment; the name links', () => {
    renderWithProviders(
      <ol>
        <LevelCard level={LEVEL} />
      </ol>,
    )

    const card = screen.getByRole('listitem')
    const link = within(card).getByRole('link')
    expect(link).toHaveAccessibleName('Sample Level 1')
    expect(link).toHaveAttribute('href', '/level/sample-level-1')
    expect(within(card).getByRole('heading', { level: 2 })).toHaveTextContent('Sample Level 1')
    expect(card).toHaveTextContent('Rank #1')
    expect(card).toHaveTextContent('by Creator Alpha')
    expect(card).toHaveTextContent('Extreme Demon')
    expect(card).toHaveTextContent('250.00 pts')
    expect(card).toHaveTextContent('2 victors')
    expect(card).toHaveTextContent('8.0 out of 10')
    // The first victor's YouTube video gives the thumbnail.
    expect(within(card).getByRole('img', { name: 'Sample Level 1 thumbnail' })).toHaveAttribute(
      'src',
      ytThumb('dQw4w9WgXcQ'),
    )
    // Labelled values for screen readers.
    expect(
      within(card)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Difficulty', 'Points', 'Victors', 'Average enjoyment'])
  })

  it('handles one victor, no rating, no creator, and the optional section badge', () => {
    const level = { ...TEST_LEVELS[2]!, victor_count: 1, avg_enjoyment: null }
    renderWithProviders(<LevelCard level={level} as="div" titleAs="h3" showSection />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sample Level 3')
    expect(
      screen.getByRole('heading', { level: 3 }).closest('div[class*="grid"]'),
    ).toHaveTextContent(/1 victor(?!s)/)
    expect(screen.getByText('Not rated yet')).toBeInTheDocument()
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
  })

  it('has a skeleton of the same shape, hidden from screen readers', () => {
    const { container } = render(
      <ol>
        <LevelCardSkeleton />
      </ol>,
    )
    const item = container.querySelector('li')
    expect(item).toHaveAttribute('aria-hidden', 'true')
    expect(item?.querySelector('.aspect-video')).not.toBeNull()
  })
})
