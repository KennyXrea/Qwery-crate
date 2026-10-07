import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Header } from '../components/layout/Header'
import { ToastProvider } from '../components/ui/ToastProvider'
import { routes } from '../routes'

beforeAll(() => {
  // jsdom doesn't implement scrolling; ScrollRestoration calls it on navigation.
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true, configurable: true })
})

async function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  await screen.findByRole('banner')
  return router
}

/** Fires "/" and returns false if something called preventDefault (i.e. the key was swallowed). */
function pressSlash(target: Element = document.body): boolean {
  return fireEvent.keyDown(target, { key: '/', code: 'Slash' })
}

function getMenuButton(): HTMLElement {
  return within(screen.getByRole('banner')).getByRole('button', { name: /menu/ })
}

/** Opens the mobile menu and returns its panel. */
function openMenu(): HTMLElement {
  const menuButton = getMenuButton()
  fireEvent.click(menuButton)
  expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  const panel = document.getElementById(menuButton.getAttribute('aria-controls') ?? '')
  if (!panel) throw new Error('menu panel not found')
  return panel
}

function getLogo(): HTMLElement {
  return within(screen.getByRole('banner')).getByRole('link', { name: 'Qwerty Crate — home' })
}

describe('search shortcut', () => {
  it('opens the search dialog with "/" and focuses its field', async () => {
    await renderAt('/')

    pressSlash()

    const dialog = await screen.findByRole('dialog', { name: 'Search' })
    const input = within(dialog).getByRole('searchbox', { name: 'Search levels and players' })
    expect(input).toHaveFocus()

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens from the header button and gives focus back to it on close', async () => {
    await renderAt('/')
    const button = within(screen.getByRole('banner')).getByRole('button', { name: 'Search' })
    act(() => button.focus())

    fireEvent.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Search' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('does not open a second dialog while one is open', async () => {
    await renderAt('/')

    pressSlash()
    const input = await screen.findByRole('searchbox')
    // Typing "/" in the search field itself must reach the field.
    expect(pressSlash(input)).toBe(true)
    // Focus left the dialog (e.g. a dismissed toast): still no second dialog.
    pressSlash(document.body)

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('lets "/" be typed into text fields instead of opening search', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <>
            <Header />
            <input aria-label="URL" />
            <textarea aria-label="Notes" />
          </>
        ),
      },
    ])
    render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    )

    for (const field of [
      await screen.findByRole('textbox', { name: 'URL' }),
      screen.getByRole('textbox', { name: 'Notes' }),
    ]) {
      act(() => field.focus())
      expect(pressSlash(field)).toBe(true)
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ignores "/" with Ctrl or Cmd held', async () => {
    await renderAt('/')

    fireEvent.keyDown(document.body, { key: '/', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: '/', metaKey: true })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('mobile menu', () => {
  it('opens with the menu button and closes after choosing a page', async () => {
    const router = await renderAt('/')
    const banner = screen.getByRole('banner')
    const menuButton = within(banner).getByRole('button', { name: 'Open menu' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(menuButton).toHaveAccessibleName('Close menu')
    const panel = document.getElementById(menuButton.getAttribute('aria-controls') ?? '')
    expect(panel).not.toBeNull()
    expect(panel).toBeVisible()

    fireEvent.click(within(panel as HTMLElement).getByRole('link', { name: 'Recent changes' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recent changes' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/recent')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toBeVisible()
  })

  it('closes when the logo is used, and stays closed on coming back to that page', async () => {
    await renderAt('/list')
    openMenu()

    await act(async () => fireEvent.click(getLogo()))
    expect(await screen.findByRole('heading', { level: 1, name: 'Qwerty Crate' })).toBeVisible()
    await act(async () => fireEvent.click(screen.getByRole('link', { name: /view the list/i })))

    expect(await screen.findByRole('heading', { level: 1, name: 'The List' })).toBeVisible()
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays closed after going Back to the page it was opened on', async () => {
    const router = await renderAt('/players')
    openMenu()

    await act(async () => fireEvent.click(getLogo()))
    await act(() => router.navigate(-1))

    expect(router.state.location.pathname).toBe('/players')
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when the logo is used on the home page itself', async () => {
    await renderAt('/')
    openMenu()

    await act(async () => fireEvent.click(getLogo()))

    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when keyboard focus leaves the header, but not when moving inside it', async () => {
    await renderAt('/list')
    const panel = openMenu()
    const menuButton = getMenuButton()

    act(() => within(panel).getByRole('link', { name: 'Players' }).focus())
    act(() => menuButton.focus())
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    act(() => screen.getByRole('link', { name: 'Sample Level 1' }).focus())
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('returns focus to the menu button when search opened from the menu closes', async () => {
    await renderAt('/list')
    const panel = openMenu()
    const link = within(panel).getByRole('link', { name: 'Players' })
    act(() => link.focus())

    pressSlash(link)
    const dialog = await screen.findByRole('dialog', { name: 'Search' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(getMenuButton()).toHaveFocus()
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it("keeps focus on the menu button after choosing the page you're already on", async () => {
    await renderAt('/players')
    const panel = openMenu()

    fireEvent.click(within(panel).getByRole('link', { name: 'Players' }))

    expect(getMenuButton()).toHaveFocus()
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and returns focus to the menu button', async () => {
    await renderAt('/list')
    const menuButton = within(screen.getByRole('banner')).getByRole('button', {
      name: 'Open menu',
    })

    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton).toHaveFocus()
  })
})

describe('focus after navigation', () => {
  it('moves focus to the new page content after a menu link is used', async () => {
    await renderAt('/')

    fireEvent.click(
      within(within(screen.getByRole('banner')).getAllByRole('navigation')[0]).getByRole('link', {
        name: 'Stats',
      }),
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Stats' })).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('leaves focus alone on the first load', async () => {
    await renderAt('/list')
    await screen.findByRole('heading', { level: 1, name: 'The List' })

    expect(screen.getByRole('main')).not.toHaveFocus()
  })
})

describe('current page in the menu', () => {
  function mainNavLink(name: string): HTMLElement {
    const nav = within(screen.getByRole('banner')).getAllByRole('navigation', { name: 'Main' })[0]
    return within(nav).getByRole('link', { name })
  }

  it('marks the current page with aria-current="page"', async () => {
    await renderAt('/list')

    expect(mainNavLink('List')).toHaveAttribute('aria-current', 'page')
    expect(mainNavLink('Players')).not.toHaveAttribute('aria-current')
  })

  it('marks the section of a detail page with aria-current="true"', async () => {
    await renderAt('/level/sample-level-1')

    expect(mainNavLink('List')).toHaveAttribute('aria-current', 'true')
    expect(mainNavLink('Players')).not.toHaveAttribute('aria-current')
  })
})
