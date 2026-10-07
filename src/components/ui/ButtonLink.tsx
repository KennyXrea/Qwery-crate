import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import type { LinkProps } from 'react-router'
import { buttonClasses } from './button-styles'
import type { ButtonSize, ButtonVariant } from './button-styles'

export type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  ref?: Ref<HTMLAnchorElement>
}

/** A router link that looks like a Button. Use it for navigation; use Button for actions. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ref,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link {...rest} ref={ref} className={buttonClasses({ variant, size, fullWidth, className })}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  )
}
