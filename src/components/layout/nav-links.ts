/** The main menu, in display order. Used by the header, the mobile menu and the footer. */
export const NAV_LINKS = [
  { to: '/list', label: 'List' },
  { to: '/players', label: 'Players' },
  { to: '/stats', label: 'Stats' },
  { to: '/recent', label: 'Recent changes' },
  { to: '/about', label: 'About' },
] as const

export type NavLinkItem = (typeof NAV_LINKS)[number]

/**
 * Detail pages that belong to a menu section even though their URL doesn't start with it:
 * a level page (/level/:slug) is part of "List", a player page (/player/:slug) of "Players".
 */
const SECTION_DETAIL_PREFIXES: Partial<Record<string, string>> = {
  '/list': '/level/',
  '/players': '/player/',
}

/**
 * Whether a menu link should look active for the current path. Covers the page itself, any
 * sub-path of it, and the detail pages of its section. Case-insensitive, like the router.
 */
export function isNavLinkActive(to: string, pathname: string): boolean {
  const path = normalizePath(pathname)
  const target = to.toLowerCase()
  if (path === target || path.startsWith(`${target}/`)) return true
  const detailPrefix = SECTION_DETAIL_PREFIXES[target]
  return detailPrefix !== undefined && path.startsWith(detailPrefix)
}

/**
 * The `aria-current` value for a menu link, matching what `isNavLinkActive` shows: `'page'` on
 * the page itself, `'true'` ("current section") on its sub-pages and detail pages, so screen
 * reader users get the same cue as the visual highlight.
 */
export function navLinkAriaCurrent(to: string, pathname: string): 'page' | 'true' | undefined {
  if (!isNavLinkActive(to, pathname)) return undefined
  return normalizePath(pathname) === to.toLowerCase() ? 'page' : 'true'
}

/** Lower-case, without a trailing slash (the router matches paths case-insensitively). */
function normalizePath(pathname: string): string {
  return pathname.toLowerCase().replace(/(.)\/+$/, '$1')
}
