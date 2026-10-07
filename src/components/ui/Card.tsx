import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type CardElement = 'div' | 'section' | 'article' | 'aside' | 'li'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** The HTML element to render. Defaults to `div`. */
  as?: CardElement
  padding?: CardPadding
  /** Adds hover (and keyboard-focus-inside) feedback for cards that are clickable. */
  interactive?: boolean
}

const PADDING: Record<CardPadding, string | undefined> = {
  none: undefined,
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

/**
 * A raised surface. A clickable card should contain one real link styled with `STRETCHED_LINK`
 * (card-link.ts), which makes the whole card clickable and draws its focus ring.
 */
export function Card({
  as: Element = 'div',
  padding = 'md',
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <Element
      {...rest}
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-lg shadow-black/20',
        PADDING[padding],
        interactive &&
          'transition-colors hover:border-border-strong hover:bg-surface-2 has-focus-visible:border-accent',
        className,
      )}
    />
  )
}
