import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'
import { Field } from './Field'
import { controlClasses, describedBy, joinIds } from './field-utils'
import { IconChevronDown } from './icons'

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'size' | 'children'> & {
  label: string
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  hint?: ReactNode
  /** Shows the message, marks the field invalid and links the two for screen readers. */
  error?: string
  options: SelectOption[]
  /** Text for an empty first choice (`value=""`), e.g. "Any difficulty" or "Choose a level…". */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
  /** Classes for the wrapper (label + field + messages) — use it for layout, e.g. grid spans. */
  className?: string
  /** Extra classes for the `<select>` element itself, appended last. */
  selectClassName?: string
}

/** A labelled native `<select>` (best on phones and for screen readers), styled like Input. */
export function Select({
  id,
  label,
  hideLabel,
  hint,
  error,
  options,
  placeholder,
  required,
  multiple,
  className,
  selectClassName,
  ref,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const invalid = Boolean(error)

  return (
    <Field
      id={selectId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <select
          {...rest}
          ref={ref}
          id={selectId}
          required={required}
          multiple={multiple}
          aria-invalid={invalid ? true : ariaInvalid}
          aria-describedby={joinIds(describedBy(selectId, { hint, error }), ariaDescribedBy)}
          className={cn(
            controlClasses(invalid),
            multiple ? 'px-2 py-2' : 'min-h-11 cursor-pointer appearance-none py-2 pr-10 pl-3',
            // While the empty placeholder choice is selected, show it dimmed like a placeholder.
            placeholder !== undefined && "has-[option[value='']:checked]:text-muted",
            selectClassName,
          )}
        >
          {placeholder !== undefined ? (
            <option value="" className="bg-surface-2 text-muted">
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-surface-2 text-text"
            >
              {option.label}
            </option>
          ))}
        </select>
        {multiple ? null : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted"
          >
            <IconChevronDown className="size-4" />
          </span>
        )}
      </div>
    </Field>
  )
}
