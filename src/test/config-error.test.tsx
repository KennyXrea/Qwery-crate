import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeStartupError, isChunkLoadError } from '../lib/load-error'
import { ConfigErrorPage } from '../pages/ConfigErrorPage'

describe('ConfigErrorPage', () => {
  it('explains how to fix missing settings by default', async () => {
    render(<ConfigErrorPage problems={['VITE_SUPABASE_URL is missing']} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Configuration error' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_SUPABASE_URL is missing')
    expect(screen.getByText(/settings are missing or wrong/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How to fix it' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reload page' })).not.toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Configuration error — Qwerty Crate'))
  })

  it('offers a reload, not setup steps, when the site failed to load', async () => {
    render(<ConfigErrorPage kind="load" problems={[describeStartupError(new TypeError('x'))]} />)

    expect(screen.getByRole('heading', { level: 1, name: 'The site failed to load' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled()
    expect(screen.queryByText(/settings are missing or wrong/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'How to fix it' })).not.toBeInTheDocument()
    expect(screen.queryByText(/VITE_SUPABASE_URL/)).not.toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('The site failed to load — Qwerty Crate'))
  })
})

describe('startup error messages', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://example.com/assets/App-abc.js',
    'error loading dynamically imported module: https://example.com/assets/App-abc.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/App-abc.css',
  ])('treats "%s" as a download problem', (message) => {
    const error = new TypeError(message)
    expect(isChunkLoadError(error)).toBe(true)
    expect(describeStartupError(error)).toMatch(/could not be downloaded/)
  })

  it('does not blame the connection for other startup crashes', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false)
    expect(isChunkLoadError('Importing a module script failed.')).toBe(false)
    expect(describeStartupError(new Error('boom'))).toMatch(/unexpected error/)
  })
})
