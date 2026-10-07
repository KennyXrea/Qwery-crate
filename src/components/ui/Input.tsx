import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { Field } from './Field'
import { controlClasses, describedBy, joinIds } from './field-utils'

export type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size'> & {
  label: string
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  hint?: ReactNode
  /** Shows the message, marks the field invalid and links the two for screen readers. */
  error?: string
  /** Decorative icon inside the field on the left (e.g. a search glass). */
  leftIcon?: ReactNode
  ref?: Ref<HTMLInputElement>
  /** Classes for the wrapper (label + field + messages) — use it for layout, e.g. grid spans. */
  className?: string
  /** Extra classes for the `<input>` element itself, appended last. */
  inputClassName?: string
}

/** A labelled text input. Every input in the app should go through this (or Field). */
export function Input({
  id,
  label,
  hideLabel,
  hint,
  error,
  leftIcon,
  required,
  className,
  inputClassName,
  ref,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const invalid = Boolean(error)

  return (
    <Field
      id={inputId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="group relative">
        {leftIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted transition-colors group-focus-within:text-accent"
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          {...rest}
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={invalid ? true : ariaInvalid}
          aria-describedby={joinIds(describedBy(inputId, { hint, error }), ariaDescribedBy)}
          className={cn(
            controlClasses(invalid),
            'min-h-11 py-2',
            leftIcon ? 'pr-3 pl-10' : 'px-3',
            inputClassName,
          )}
        />
      </div>
    </Field>
  )
}
