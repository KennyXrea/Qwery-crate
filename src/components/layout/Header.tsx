import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '../../lib/cn'
import { IconClose, IconMenu, IconSearch } from '../ui/icons'
import { openModalCount } from '../ui/modal-stack'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { NAV_LINKS, isNavLinkActive, navLinkAriaCurrent } from './nav-links'
import { SearchDialog } from './SearchDialog'

/** True when a key press is meant for a text field (or anything inside a dialog). */
function isTypingOrDialogTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest('[role="dialog"]')) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function Header() {
  const location = useLocation()
  const { pathname } = location
  const menuId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu on every navigation: a menu link, the logo (even to the page you're on),
  // Back/Forward. Each one creates a new location key. Adjusting state during render like this
  // is React's pattern for "reset when something changes" — no effect needed.
  const [menuLocationKey, setMenuLocationKey] = useState(location.key)
  if (location.key !== menuLocationKey) {
    setMenuLocationKey(location.key)
    setMenuOpen(false)
  }

  const openSearch = useCallback(() => {
    // Opened from inside the menu (the "/" key on a menu link): that link is about to be
    // hidden, so make the menu button the element focus returns to when search closes.
    if (document.getElementById(menuId)?.contains(document.activeElement)) {
      menuButtonRef.current?.focus()
    }
    setMenuOpen(false)
    setSearchOpen(true)
  }, [menuId])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Keyboard focus leaving the header (Tab past the last menu link, Shift+Tab up from the
  // page) closes the menu, so the newly focused element isn't hidden behind it. Moving between
  // the menu button and the menu links stays inside the header and keeps it open. When the
  // window loses focus or a non-focusable spot is clicked there's no `relatedTarget`, and the
  // menu stays open too.
  function handleBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget
    if (menuOpen && next instanceof Node && !event.currentTarget.contains(next)) closeMenu()
  }

  // Press "/" anywhere (outside a text field) to open search. Ignored while any dialog is
  // open, even if focus has slipped out of it (e.g. after a toast was dismissed).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.defaultPrevented || event.isComposing) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (openModalCount() > 0 || isTypingOrDialogTarget(event.target)) return
      event.preventDefault()
      openSearch()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch])

  return (
    <header className="sticky top-0 z-40" onBlur={handleBlur}>
      <div className="relative z-20 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="page-container flex h-16 items-center gap-3">
          <Logo />

          <nav aria-label="Main" className="ml-4 hidden md:block lg:ml-8">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isNavLinkActive(link.to, pathname)
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      aria-current={navLinkAriaCurrent(link.to, pathname)}
                      className={cn(
                        'relative inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors lg:px-3',
                        // The accent bar is a background, which forced-colors (high contrast)
                        // mode removes, so the active link is underlined there instead.
                        active
                          ? 'text-text after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent forced-colors:underline forced-colors:decoration-2 forced-colors:underline-offset-4 lg:after:inset-x-3'
                          : 'text-muted hover:bg-surface-2/60 hover:text-text',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-haspopup="dialog"
              aria-keyshortcuts="/"
              // An icon button like the menu button below lg (the label would squeeze the logo at
              // tablet widths); a search-field look with the "/" hint from lg up.
              className="inline-flex size-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 text-sm text-text transition-colors hover:border-border-strong hover:bg-surface-2 lg:w-auto lg:min-w-48 lg:justify-start lg:px-3 lg:text-muted lg:hover:text-text"
            >
              <IconSearch />
              <span className="sr-only lg:not-sr-only">Search</span>
              <kbd
                aria-hidden="true"
                className="hidden h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 font-mono text-xs leading-none text-muted lg:ml-auto lg:inline-flex"
              >
                /
              </kbd>
            </button>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface/70 text-text transition-colors hover:border-border-strong hover:bg-surface-2 aria-expanded:border-border-strong aria-expanded:bg-surface-2 md:hidden"
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      <MobileNav id={menuId} open={menuOpen} onClose={closeMenu} returnFocusRef={menuButtonRef} />
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </header>
  )
}
