import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { hasContent } from './field-utils'
import { IconAlert } from './icons'

export type FieldProps = {
  /** The id of the control inside. Hint and error get `<id>-hint` / `<id>-error`. */
  id: string
  label: string
  /** Keep the label for screen readers only (the control must still make sense visually). */
  hideLabel?: boolean
  hint?: ReactNode
  error?: string
  required?: boolean
  /** The control itself. Point its `aria-describedby` at the hint/error (see `describedBy`). */
  children: ReactNode
  className?: string
}

/**
 * Label + control + hint + error, laid out consistently.
 * Input, Textarea and Select use it; reach for it directly only for custom controls.
 */
export function Field({
  id,
  label,
  hideLabel = false,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldProps) {
  const showHint = hasContent(hint)
  const showError = hasContent(error)

  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-text'}
      >
        {label}
        {required ? (
          // The control's own `required` attribute is what screen readers announce.
          <span aria-hidden="true" className="ml-0.5 text-muted">
            *
          </span>
        ) : null}
      </label>

      {children}

      {showHint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}

      {showError ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
          <IconAlert className="mt-0.5 size-4" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : null}
    </div>
  )
}
