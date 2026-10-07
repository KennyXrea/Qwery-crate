import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { App } from '../App'

// Smoke test of the real app shell exactly as main.tsx renders it: ToastProvider +
// RouterProvider from 'react-router/dom' + the browser router. It guards against the two
// react-router entry points loading separate copies of the router in tests (see vite.config.ts).

beforeAll(() => {
  // jsdom doesn't implement scrolling; ScrollRestoration calls it on navigation.
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true, configurable: true })
})

describe('App', () => {
  it('renders the home page and navigates with the header menu', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Qwerty Crate' }),
    ).toBeInTheDocument()

    const nav = within(screen.getByRole('banner')).getAllByRole('navigation', { name: 'Main' })[0]
    fireEvent.click(within(nav).getByRole('link', { name: 'Stats' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Stats' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/stats')
  })
})
