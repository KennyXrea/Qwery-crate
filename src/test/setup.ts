import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library can't register its automatic cleanup.
// Unmount whatever a test rendered so the next test starts with an empty page.
afterEach(() => {
  cleanup()
})
