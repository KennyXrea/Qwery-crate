import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Footer } from './Footer'
import { Header } from './Header'

/** Moves keyboard focus to <main> without changing the URL (a "#main" hash would confuse the router). */
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById('main')
  if (!main) return
  event.preventDefault()
  main.focus({ preventScroll: true })
  main.scrollIntoView({ block: 'start' })
}

/** Frame shared by every public page: skip link, header, page content, footer. */
export function RootLayout() {
  const { pathname } = useLocation()
  const lastPathname = useRef(pathname)

  // After moving to another page, put keyboard focus at the start of the new content, so screen
  // readers announce it and Tab continues from there (the link that was clicked may be gone,
  // e.g. inside the closed mobile menu). Not on the first load: that starts at the top as usual.
  // Comparing with the previous path (instead of a "first render" flag) also keeps StrictMode's
  // double-run of effects from stealing focus on load.
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-10 focus:items-center focus:rounded-xl focus:bg-accent-strong focus:px-4 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:shadow-black/40"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  )
}
