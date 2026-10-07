import { useEffect } from 'react'

export const SITE_NAME = 'Qwerty Crate'

/** "Level name — Qwerty Crate", or just "Qwerty Crate" when there is no page title. */
export function formatPageTitle(title?: string): string {
  const trimmed = title?.trim()
  return trimmed ? `${trimmed} — ${SITE_NAME}` : SITE_NAME
}

/** Sets the browser tab title for the current page. */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = formatPageTitle(title)
  }, [title])
}
