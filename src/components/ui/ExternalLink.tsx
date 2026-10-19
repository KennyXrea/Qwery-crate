import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { safeExternalUrl } from '../../lib/url'
import { buttonClasses } from './button-styles'
import type { ButtonSize, ButtonVariant } from './button-styles'
import { IconExternal } from './icons'
import { ACCENT_INLINE_LINK } from './link-styles'

type ExternalBaseProps = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'target' | 'rel'> & {
  /**
   * A link that came from the database (a video, a channel…). It is checked with
   * safeExternalUrl: only a full http(s) address becomes a link.
   */
  href: string | null | undefined
  /** Rendered instead when `href` is missing or not a safe link. Defaults to nothing. */
  fallback?: ReactNode
  /** Shows the ↗ icon after the text. Default true. */
  showIcon?: boolean
  ref?: Ref<HTMLAnchorElement>
}

export type ExternalLinkProps = ExternalBaseProps & {
  /** Leave out the default accent-blue link look (style it yourself with className). */
  plain?: boolean
}

export type ExternalButtonLinkProps = ExternalBaseProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
}

/** Read by screen readers after the link text, so nobody is surprised by the new tab. */
function NewTabHint() {
  return <span className="sr-only"> (opens in a new tab)</span>
}

/**
 * A link to another site, for addresses that came from user data. It always opens in a new
 * tab with rel="noopener noreferrer", and renders `fallback` (nothing by default) instead of a
 * link when the address isn't a safe http(s) link — so "javascript:" can never be clicked.
 */
export function ExternalLink({
  href,
  fallback = null,
  showIcon = true,
  plain = false,
  className,
  children,
  ref,
  ...rest
}: ExternalLinkProps) {
  const safeHref = safeExternalUrl(href)
  if (!safeHref) return <>{fallback}</>

  return (
    <a
      {...rest}
      ref={ref}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(!plain && ACCENT_INLINE_LINK, className)}
    >
      {children}
      {showIcon ? (
        <IconExternal className="ml-0.5 inline-block size-[0.85em] align-[-0.075em]" />
      ) : null}
      <NewTabHint />
    </a>
  )
}

/** ExternalLink that looks like a Button, e.g. "Watch video ↗" or "YouTube channel ↗". */
export function ExternalButtonLink({
  href,
  fallback = null,
  showIcon = true,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  className,
  children,
  ref,
  ...rest
}: ExternalButtonLinkProps) {
  const safeHref = safeExternalUrl(href)
  if (!safeHref) return <>{fallback}</>

  return (
    <a
      {...rest}
      ref={ref}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {leftIcon}
      {children}
      {showIcon ? <IconExternal /> : null}
      <NewTabHint />
    </a>
  )
}
