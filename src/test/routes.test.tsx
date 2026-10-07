import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, data } from 'react-router'
import type { RouteObject } from 'react-router'
// The same RouterProvider the app uses (App.tsx).
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ui/ToastProvider'
import { formatPageTitle } from '../hooks/usePageTitle'
import { nameFromSlug } from '../pages/page-utils'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { routes } from '../routes'

const NAV_ORDER = ['List', 'Players', 'Stats', 'Recent changes', 'About']
/** Lazily loaded pages need a moment for their code to be imported. */
const LAZY_TIMEOUT = { timeout: 5000 }

beforeAll(() => {
  // jsdom doesn't implement scrolling; ScrollRestoration calls these on navigation.
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true, configurable: true })
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }),
    })
  }
})

afterEach(() => {
  cleanup()
  document.title = ''
  vi.restoreAllMocks()
})

function renderRoutes(path: string, routeTable: RouteObject[] = routes) {
  const router = createMemoryRouter(routeTable, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  return router
}

function mainNav() {
  return within(screen.getByRole('banner')).getAllByRole('navigation', { name: 'Main' })[0]
}

describe('public routes', () => {
  it('shows the home page at /', async () => {
    renderRoutes('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Qwerty Crate' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view the list/i })).toHaveAttribute('href', '/list')
    await waitFor(() => expect(document.title).toBe('Qwerty Crate'))
  })

  it('lists the header navigation in the agreed order', async () => {
    renderRoutes('/')
    await screen.findByRole('banner')

    const labels = within(mainNav())
      .getAllByRole('link')
      .map((link) => link.textContent?.replace(/\s+/g, ' ').trim())
    expect(labels).toEqual(NAV_ORDER)
  })

  it('shows the list page with placeholder level cards and a sidebar', async () => {
    renderRoutes('/list')

    expect(await screen.findByRole('heading', { level: 1, name: 'The List' })).toBeInTheDocument()
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByRole('link', { name: `Sample Level ${n}` })).toHaveAttribute(
        'href',
        `/level/sample-level-${n}`,
      )
    }
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How points work' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('The List — Qwerty Crate'))
  })

  it('navigates from the home page to the list with a link click', async () => {
    renderRoutes('/')

    fireEvent.click(await screen.findByRole('link', { name: /view the list/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'The List' })).toBeInTheDocument()
  })

  it('shows the slug on a level page', async () => {
    renderRoutes('/level/sample-level')

    expect(await screen.findByText('sample-level')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Sample Level' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Sample Level — Qwerty Crate'))
  })

  it('shows the slug on a player page', async () => {
    renderRoutes('/player/player-alpha')

    expect(await screen.findByText('player-alpha')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Player Alpha' })).toBeInTheDocument()
  })

  it.each([
    ['/players', 'Players', 'Players — Qwerty Crate'],
    ['/stats', 'Stats', 'Stats — Qwerty Crate'],
    ['/recent', 'Recent changes', 'Recent changes — Qwerty Crate'],
    ['/about', 'About Qwerty Crate', 'About — Qwerty Crate'],
  ])('renders %s', async (path, heading, title) => {
    renderRoutes(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(title))
  })

  it('states the "not affiliated" disclaimer on the about page', async () => {
    renderRoutes('/about')

    await screen.findByRole('heading', { level: 1, name: 'About Qwerty Crate' })
    const main = screen.getByRole('main')
    expect(
      within(main).getByText(/Not affiliated with RobTop Games or Pointercrate/),
    ).toBeInTheDocument()
  })
})

describe('not found', () => {
  it('shows a finished 404 page for unknown addresses', async () => {
    renderRoutes('/does-not-exist')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByText('/does-not-exist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /browse the list/i })).toHaveAttribute('href', '/list')
    await waitFor(() => expect(document.title).toBe('Page not found — Qwerty Crate'))
  })

  it('keeps the site header on the 404 page', async () => {
    renderRoutes('/level')

    await screen.findByRole('heading', { level: 1, name: 'Page not found' })
    expect(mainNav()).toBeInTheDocument()
  })
})

describe('lazy-loaded routes', () => {
  it('loads the admin login page inside the site layout', async () => {
    renderRoutes('/admin/login')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Admin login' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(mainNav()).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Admin login — Qwerty Crate'))
  })

  it.each(['/admin', '/admin/levels'])('shows the admin placeholder at %s', async (path) => {
    renderRoutes(path)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Admin dashboard' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to site/i })).toHaveAttribute('href', '/')
    // The admin area has its own layout, without the public navigation.
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('serves the UI kit while developing', async () => {
    renderRoutes('/dev/ui')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'UI kit' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Demo pagination' })).toBeInTheDocument()
  })
})

function Boom(): never {
  throw new Error('Kaboom')
}

describe('RouteErrorPage', () => {
  it('explains unexpected errors and offers a reload', async () => {
    // React and the router both log the caught error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderRoutes('/', [{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/')
    await waitFor(() => expect(document.title).toBe('Something went wrong — Qwerty Crate'))
  })

  it('shows the not-found screen for 404 route errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderRoutes('/missing', [
      {
        path: '/missing',
        loader: () => {
          throw data('No such level', { status: 404 })
        },
        hydrateFallbackElement: <p>Loading…</p>,
        element: <p>never shown</p>,
        errorElement: <RouteErrorPage />,
      },
    ])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByText('/missing')).toBeInTheDocument()
  })
})

describe('page helpers', () => {
  it('formats page titles', () => {
    expect(formatPageTitle()).toBe('Qwerty Crate')
    expect(formatPageTitle('   ')).toBe('Qwerty Crate')
    expect(formatPageTitle('Stats')).toBe('Stats — Qwerty Crate')
  })

  it('turns slugs into readable names', () => {
    expect(nameFromSlug('sample-level-1')).toBe('Sample Level 1')
    expect(nameFromSlug('player_alpha')).toBe('Player Alpha')
    expect(nameFromSlug('--')).toBe('')
  })
})
