import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonClassOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /**
   * Square button for a single icon (40 / 44 / 48px). Give it an `aria-label` or sr-only text.
   * Use this instead of overriding padding/width with className (there's no tailwind-merge).
   */
  iconOnly?: boolean
  /** Extra classes, appended last. */
  className?: string
}

// Tailwind v4's preflight gives buttons `cursor: default`, so we add the pointer back.
// `aria-disabled` gets the same look as `disabled` (links can't be disabled, and
// aria-disabled buttons keep keyboard focus).
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors select-none [&_svg]:shrink-0 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-strong text-white hover:bg-accent-hover',
  secondary:
    'border border-border-strong bg-surface-2 text-text hover:border-accent hover:text-white',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-bg hover:bg-danger/90',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm [&_svg]:size-4',
  md: 'min-h-11 px-4 text-sm [&_svg]:size-4',
  lg: 'min-h-12 px-6 text-base [&_svg]:size-5',
}

const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  sm: 'size-10 text-sm [&_svg]:size-5',
  md: 'size-11 text-sm [&_svg]:size-5',
  lg: 'size-12 text-base [&_svg]:size-6',
}

/** The class list for anything that should look like a button (`<button>`, router `Link`, `<a>`). */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className,
}: ButtonClassOptions = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    iconOnly ? ICON_ONLY_SIZES[size] : SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}
