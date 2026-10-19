import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountryFlag } from '../components/player/CountryFlag'
import { PlayerAvatar } from '../components/player/PlayerAvatar'
import { PlayerLink } from '../components/player/PlayerLink'
import { avatarTone } from '../components/player/player-visuals'
import { ExternalButtonLink, ExternalLink } from '../components/ui/ExternalLink'
import { TEST_PLAYERS } from './api-mocks'
import { renderWithProviders } from './render'

// Uploaded avatars live in Supabase Storage; use a fixed fake project instead of .env.local.
vi.mock('../lib/env', () => ({
  getEnv: () => ({
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  }),
}))

const ALPHA = TEST_PLAYERS[0]!
const GAMMA = TEST_PLAYERS[2]!

describe('CountryFlag', () => {
  it('shows the flag emoji with an accessible name and a tooltip', () => {
    render(<CountryFlag code="US" />)
    const flag = screen.getByRole('img', { name: 'Flag: United States' })
    expect(flag).toHaveTextContent('\u{1F1FA}\u{1F1F8}')
    expect(flag).toHaveAttribute('title', 'United States')
  })

  it('accepts lower case', () => {
    render(<CountryFlag code="se" />)
    expect(screen.getByRole('img', { name: 'Flag: Sweden' })).toHaveTextContent(
      '\u{1F1F8}\u{1F1EA}',
    )
  })

  it.each([null, undefined, '', 'USA', '1A', 'XX', 'ZZ'])('renders nothing for %j', (code) => {
    const { container } = render(<CountryFlag code={code} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('PlayerAvatar', () => {
  it('shows initials (hidden from screen readers) when there is no picture', () => {
    const { container } = render(<PlayerAvatar player={ALPHA} />)
    const avatar = container.firstElementChild as HTMLElement
    expect(avatar).toHaveTextContent('PA')
    expect(avatar).toHaveAttribute('aria-hidden', 'true')
    expect(avatar).toHaveClass('size-10')
    expect(avatar.className).toContain(avatarTone(ALPHA.id).split(' ')[0])
  })

  it('is named "<name>\'s avatar" when it stands alone', () => {
    render(<PlayerAvatar player={ALPHA} decorative={false} size="xl" />)
    expect(screen.getByRole('img', { name: "Player Alpha's avatar" })).toHaveTextContent('PA')
  })

  it('shows the uploaded picture, and falls back to initials if it fails to load', () => {
    const { container } = render(
      <PlayerAvatar player={{ ...ALPHA, avatar_path: 'players/alpha/1.webp' }} size="lg" />,
    )
    const img = container.querySelector('img')
    expect(img).toHaveAttribute(
      'src',
      'https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/media/players/alpha/1.webp',
    )
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '64')

    fireEvent.error(img as HTMLImageElement)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('PA')
  })

  it('always gives the same player the same colour', () => {
    expect(avatarTone(ALPHA.id)).toBe(avatarTone(ALPHA.id))
  })
})

describe('PlayerLink', () => {
  it('links avatar + name to the player page, with the flag outside the link', () => {
    renderWithProviders(<PlayerLink player={ALPHA} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAccessibleName('Player Alpha')
    expect(link).toHaveAttribute('href', '/player/player-alpha')
    expect(link).toHaveClass('min-h-10')
    const flag = screen.getByRole('img', { name: 'Flag: United States' })
    expect(link).not.toContainElement(flag)
  })

  it('can leave out the avatar and flag; no flag when the player has no country', () => {
    renderWithProviders(<PlayerLink player={ALPHA} showAvatar={false} showFlag={false} />)
    expect(screen.getByRole('link')).toHaveTextContent(/^Player Alpha$/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows no flag for a player without a country', () => {
    renderWithProviders(<PlayerLink player={GAMMA} />)
    expect(screen.queryByRole('img', { name: /flag/i })).not.toBeInTheDocument()
  })
})

describe('ExternalLink / ExternalButtonLink', () => {
  // (Testing Library drops the space before "(opens…)"; browsers keep it.)
  it('opens a safe link in a new tab without sharing the page', () => {
    render(<ExternalLink href=" https://example.com/clip ">video</ExternalLink>)
    const link = screen.getByRole('link', { name: /^video ?\(opens in a new tab\)$/ })
    expect(link).toHaveAttribute('href', 'https://example.com/clip')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '/admin', '', null, undefined])(
    'never links %j (renders the fallback instead)',
    (href) => {
      render(
        <ExternalLink href={href} fallback={<span>no link</span>}>
          video
        </ExternalLink>,
      )
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('no link')).toBeInTheDocument()
    },
  )

  it('has a button-looking version', () => {
    render(<ExternalButtonLink href="https://www.youtube.com/@alpha">Channel</ExternalButtonLink>)
    const link = screen.getByRole('link', { name: /^Channel ?\(opens in a new tab\)$/ })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.className).toContain('min-h-11')
  })
})
