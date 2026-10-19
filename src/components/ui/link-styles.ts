/**
 * Class lists for text links, shared so every page's links look and behave the same.
 * (For links that look like buttons use buttonClasses / ButtonLink; for links people typed in
 * — videos, channels — use ExternalLink, which checks the address first.)
 */

/**
 * A standalone link such as "View all" or "Read how points work": accent blue with a 40px
 * tall tap area. Add an icon inside if you like (it is sized to the text).
 */
export const TEXT_LINK =
  'inline-flex min-h-10 items-center gap-1.5 font-semibold text-accent transition-colors hover:text-accent-soft [&_svg]:size-4'

/**
 * A name inside a sentence or table cell ("**Player** beat **Level**"): white and bold with a
 * faint blue underline, blue on hover. It stays an inline element so it wraps like text; on
 * touch screens its tap area grows to about 40px tall without changing the line height.
 */
export const INLINE_LINK =
  'font-semibold text-text underline decoration-accent/40 underline-offset-[3px] transition-colors hover:text-accent-soft hover:decoration-accent-soft pointer-coarse:py-2.5'

/** An accent-blue link inside running text (e.g. "video ↗", an About page link). */
export const ACCENT_INLINE_LINK =
  'font-medium text-accent underline-offset-[3px] transition-colors hover:text-accent-soft hover:underline pointer-coarse:py-2.5'
