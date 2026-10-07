import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { Field } from './Field'
import { controlClasses, describedBy, joinIds } from './field-utils'

export type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  label: string
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  hint?: ReactNode
  /** Shows the message, marks the field invalid and links the two for screen readers. */
  error?: string
  ref?: Ref<HTMLTextAreaElement>
  /** Classes for the wrapper (label + field + messages) — use it for layout, e.g. grid spans. */
  className?: string
  /** Extra classes for the `<textarea>` element itself, appended last. */
  textareaClassName?: string
}

/** A labelled multi-line text field that the user can make taller. */
export function Textarea({
  id,
  label,
  hideLabel,
  hint,
  error,
  required,
  rows = 4,
  className,
  textareaClassName,
  ref,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const invalid = Boolean(error)

  return (
    <Field
      id={textareaId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <textarea
        {...rest}
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={invalid ? true : ariaInvalid}
        aria-describedby={joinIds(describedBy(textareaId, { hint, error }), ariaDescribedBy)}
        className={cn(
          controlClasses(invalid),
          'min-h-11 resize-y px-3 py-2.5 leading-6',
          textareaClassName,
        )}
      />
    </Field>
  )
}
