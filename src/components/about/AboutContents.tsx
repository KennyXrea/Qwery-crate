import { Link } from 'react-router'
import { ABOUT_SECTIONS } from './about-sections'

/**
 * Keyboard focus follows the jump, so Tab continues inside the section (the heading needs
 * tabIndex={-1}). The router scrolls to the hash itself (ScrollRestoration).
 */
function focusSection(id: string) {
  document.getElementById(id)?.focus({ preventScroll: true })
}

/**
 * "On this page": links to the About page's sections, in a sticky column beside the text on
 * large screens (hidden on smaller ones, where the page is one short column anyway). The links
 * change only the URL's #hash, so a section can also be shared.
 */
export function AboutContents() {
  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="font-mono text-xs font-medium tracking-widest text-muted uppercase">
          On this page
        </p>
        <ul className="mt-3 border-l border-border">
          {ABOUT_SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                to={`#${section.id}`}
                onClick={() => focusSection(section.id)}
                className="-ml-px flex min-h-10 items-center border-l-2 border-transparent pl-4 text-sm text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
