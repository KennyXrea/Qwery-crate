import { useEffect } from 'react'
import type { RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '../../lib/cn'
import { IconChevronRight } from '../ui/icons'
import { NAV_LINKS, isNavLinkActive, navLinkAriaCurrent } from './nav-links'

type MobileNavProps = {
  /** id of the panel, referenced by the menu button's `aria-controls`. */
  id: string
  open: boolean
  onClose: () => void
  /**
   * Element that gets focus back when the menu closes with Escape or a link (the menu button),
   * so focus never drops to the page body when the panel hides. After a link opens another page,
   * RootLayout then moves focus to the new page's content.
   */
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Drop-down menu for phones and small tablets (hidden from `md` up). Must be rendered inside
 * the sticky header: the panel hangs just below it. Closes on link click, Escape, a tap on
 * the dimmed page behind it, any navigation, and when keyboard focus leaves the header (Header).
 */
export function MobileNav({ id, open, onClose, returnFocusRef }: MobileNavProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onClose()
      returnFocusRef?.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, returnFocusRef])

  return (
    <>
      {open && (
        // Purely a pointer convenience; keyboard users close the menu with Escape or the button.
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-x-0 top-16 bottom-0 z-0 animate-fade-in bg-black/50 md:hidden"
        />
      )}
      <nav
        id={id}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full z-10 max-h-[calc(100dvh-4rem)] animate-fade-in overflow-y-auto overscroll-contain border-b border-border bg-bg/95 shadow-lg shadow-black/30 backdrop-blur md:hidden"
      >
        <ul className="page-container flex flex-col gap-1 py-3">
          {NAV_LINKS.map((link) => {
            const active = isNavLinkActive(link.to, pathname)
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={navLinkAriaCurrent(link.to, pathname)}
                  onClick={() => {
                    returnFocusRef?.current?.focus()
                    onClose()
                  }}
                  className={cn(
                    'relative flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-base font-medium transition-colors',
                    // Backgrounds vanish in forced-colors (high contrast) mode: underline instead.
                    active
                      ? 'bg-surface-2 text-text before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:bg-accent forced-colors:underline forced-colors:decoration-2 forced-colors:underline-offset-4'
                      : 'text-muted hover:bg-surface-2/60 hover:text-text',
                  )}
                >
                  {link.label}
                  <IconChevronRight className={active ? 'text-accent' : 'opacity-60'} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
