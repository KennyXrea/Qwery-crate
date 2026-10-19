import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { mockApiDefaults } from './api-mocks'

// Smoke test of the real app shell exactly as main.tsx renders it: ToastProvider +
// RouterProvider from 'react-router/dom' + the browser router. It guards against the two
// react-router entry points loading separate copies of the router in tests (see vite.config.ts).

beforeEach(() => {
  // The API answers from the fake dataset in api-mocks.ts (no network).
  mockApiDefaults()
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
