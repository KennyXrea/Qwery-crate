/**
 * Helpers shared by the form fields (Field, Input, Textarea, Select).
 * They live in a .ts file so the component files only export components (Fast Refresh).
 */

/** True when a hint/error value would actually render something (so it is safe to point at). */
export function hasContent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== false && value !== ''
}

/**
 * The `aria-describedby` value for a field: its hint and/or error element ids, or
 * `undefined` when there is nothing to describe it with.
 * The ids match the ones `Field` renders: `<id>-hint` and `<id>-error`.
 */
export function describedBy(
  id: string,
  { hint, error }: { hint?: unknown; error?: unknown },
): string | undefined {
  return joinIds(hasContent(hint) && `${id}-hint`, hasContent(error) && `${id}-error`)
}

/** Joins element ids into one space-separated attribute value, skipping empty parts. */
export function joinIds(...ids: Array<string | false | null | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(' ')
  return value === '' ? undefined : value
}

/** Shared look of every text-like control (input, textarea, select). */
export function controlClasses(invalid: boolean): string {
  return [
    // 16px text on phones stops iOS Safari from zooming in when the field is focused.
    'block w-full min-w-0 rounded-lg border bg-surface-2 text-base text-text sm:text-sm',
    'placeholder:text-muted transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    invalid
      ? 'border-danger focus-visible:border-danger'
      : // Tailwind emits these variants in order, so focus beats hover and disabled beats both.
        'border-border-strong hover:border-muted focus-visible:border-accent disabled:border-border-strong',
  ].join(' ')
}
