import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { buttonClasses } from './button-styles'
import type { ButtonSize, ButtonVariant } from './button-styles'
import { Spinner } from './Spinner'

export type { ButtonSize, ButtonVariant }

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Busy state: swaps the left icon for a spinner (the label stays put), marks the button
   * `aria-busy` + `aria-disabled` and ignores clicks, including form submits. It deliberately
   * does NOT set the native `disabled` attribute: that would throw keyboard focus off the button.
   */
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  /** Square icon button — pass the icon as children and give it an `aria-label`. */
  iconOnly?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  iconOnly = false,
  className,
  disabled,
  type = 'button',
  children,
  ref,
  onClick,
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading ? true : ariaBusy}
      aria-disabled={loading && !disabled ? true : ariaDisabled}
      // preventDefault also cancels a type="submit" button's form submission (pressing Enter
      // in a field "clicks" the submit button too).
      onClick={loading ? (event) => event.preventDefault() : onClick}
      className={buttonClasses({ variant, size, fullWidth, iconOnly, className })}
    >
      {loading ? <Spinner size="sm" decorative /> : leftIcon}
      {iconOnly && loading ? null : children}
      {rightIcon}
    </button>
  )
}
