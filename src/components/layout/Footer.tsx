import { Link } from 'react-router'
import { LogoMark } from './Logo'
import { NAV_LINKS } from './nav-links'

const FOOTER_PATHS: readonly string[] = ['/list', '/players', '/about']
const FOOTER_LINKS = NAV_LINKS.filter((link) => FOOTER_PATHS.includes(link.to))

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg/60">
      <div className="page-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="flex items-center gap-2.5 font-display font-bold tracking-wide text-text">
            <LogoMark className="size-7" />
            Qwerty Crate
          </p>
          <p className="max-w-sm text-sm text-muted">
            Made by and for our Geometry Dash friend group.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="-mx-3 flex flex-wrap items-center">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="page-container">
        <p className="border-t border-border/60 py-4 text-xs text-muted">
          Not affiliated with RobTop Games or Pointercrate.
        </p>
      </div>
    </footer>
  )
}
