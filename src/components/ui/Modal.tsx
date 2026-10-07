import { useEffect, useEffectEvent, useId, useRef } from 'react'
import type { MouseEvent, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { IconClose } from './icons'
import { isTopModal, pushModal } from './modal-stack'

type ModalSize = 'sm' | 'md' | 'lg'

export type ModalProps = {
  open: boolean
  /** Called on Escape, the close button and (when allowed) a backdrop click. */
  onClose: () => void
  /** The dialog's accessible name; shown as the heading unless `hideTitle`. */
  title: string
  description?: ReactNode
  children?: ReactNode
  /** Action buttons, right-aligned on desktop and stacked full-width on phones (last one on top). */
  footer?: ReactNode
  size?: ModalSize
  /**
   * What gets focus when the dialog opens. Without it: the first focusable element in the
   * body, then in the footer, then the close button.
   */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Keep the title for screen readers only. */
  hideTitle?: boolean
  closeOnBackdrop?: boolean
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * An accessible dialog: rendered on top of the page, focus stays inside it while open,
 * Escape closes it, and focus returns to whatever opened it.
 */
export function Modal({ open, ...props }: ModalProps) {
  if (!open) return null
  return createPortal(<ModalDialog {...props} />, document.body)
}

function ModalDialog({
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  hideTitle = false,
  closeOnBackdrop = true,
}: Omit<ModalProps, 'open'>) {
  const titleId = useId()
  const descriptionId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // A backdrop click only counts if the press also *started* on the backdrop, so dragging
  // a text selection out of the panel doesn't close the dialog.
  const pressStartedOnBackdrop = useRef(false)
  const hasBody = children !== undefined && children !== null && children !== false

  const requestClose = useEffectEvent(() => onClose())
  const findInitialFocus = useEffectEvent((): HTMLElement | null => {
    const fromRef = initialFocusRef?.current
    if (fromRef && panelRef.current?.contains(fromRef)) return fromRef
    return (
      firstFocusable(bodyRef.current) ??
      firstFocusable(footerRef.current) ??
      closeButtonRef.current ??
      panelRef.current
    )
  })

  useEffect(() => {
    const overlay = overlayRef.current
    const panel = panelRef.current
    if (!overlay || !panel) return

    // Whatever had focus before we opened gets it back when we close. (Prefer
    // `initialFocusRef` over `autoFocus` inside a modal: autoFocus runs first, so the
    // opener is lost.)
    const active = document.activeElement
    const opener =
      active instanceof HTMLElement && active !== document.body && !overlay.contains(active)
        ? active
        : null

    const release = pushModal(overlay)
    if (!panel.contains(document.activeElement)) findInitialFocus()?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (!overlay || !panel || !isTopModal(overlay)) return

      if (event.key === 'Escape') {
        // Let a control inside (e.g. a combobox closing its list) claim Escape first.
        if (event.defaultPrevented || event.isComposing) return
        event.preventDefault()
        requestClose()
      } else if (event.key === 'Tab') {
        trapTab(event, panel)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Release first: the opener lives in #root, which can't take focus while it is inert.
      release()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    const onBackdrop = event.target === event.currentTarget
    pressStartedOnBackdrop.current = onBackdrop
    // Keep focus inside the dialog instead of dropping it on <body>.
    if (onBackdrop) event.preventDefault()
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const startedOnBackdrop = pressStartedOnBackdrop.current
    pressStartedOnBackdrop.current = false
    if (closeOnBackdrop && startedOnBackdrop && event.target === event.currentTarget) onClose()
  }

  return (
    <div
      ref={overlayRef}
      data-modal-overlay=""
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-full animate-pop-in flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50',
          SIZES[size],
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6',
            hasBody ? 'pb-3' : 'pb-5 sm:pb-6',
          )}
        >
          <div className={cn('min-w-0 flex-1', hideTitle && !description && 'sr-only')}>
            <h2
              id={titleId}
              className={cn(
                'text-lg font-semibold break-words text-text sm:text-xl',
                hideTitle && 'sr-only',
              )}
            >
              {title}
            </h2>
            {description ? (
              <div
                id={descriptionId}
                className={cn('text-sm break-words text-muted', !hideTitle && 'mt-1')}
              >
                {description}
              </div>
            ) : null}
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close"
            onClick={onClose}
            className="-mt-1.5 -mr-2 ml-auto"
          >
            <IconClose />
          </Button>
        </div>

        {hasBody ? (
          // The 4px top padding keeps a focused first field's outline from being clipped.
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 text-text sm:px-6 sm:pb-6"
          >
            {children}
          </div>
        ) : null}

        {footer ? (
          <div
            ref={footerRef}
            className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

/** Elements inside `container` that Tab can reach, in DOM order. */
function tabbableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return candidates.filter((element) => {
    if (element.tabIndex < 0 || element.matches(':disabled')) return false
    if (element.closest('[inert], [hidden]')) return false
    // Not rendered (display: none, visibility: hidden, closed <details>…). Skipped where
    // the browser can't tell us (e.g. the jsdom test environment).
    if (typeof element.checkVisibility === 'function') {
      if (!element.checkVisibility({ visibilityProperty: true })) return false
    }
    // In a radio group only the checked radio (or the first, if none is) is a Tab stop.
    if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
      const group = candidates.filter(
        (other): other is HTMLInputElement =>
          other instanceof HTMLInputElement &&
          other.type === 'radio' &&
          other.name === element.name &&
          other.form === element.form,
      )
      const checked = group.find((radio) => radio.checked)
      return checked ? checked === element : group[0] === element
    }
    return true
  })
}

function firstFocusable(container: HTMLElement | null): HTMLElement | null {
  return tabbableElements(container)[0] ?? null
}

/** Keeps Tab / Shift+Tab cycling inside the dialog panel. */
function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  const items = tabbableElements(panel)
  if (items.length === 0) {
    event.preventDefault()
    panel.focus()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

  let target: HTMLElement | null = null
  if (!(active instanceof HTMLElement) || !panel.contains(active)) {
    // Focus wandered outside (e.g. a click on a toast): bring it back in.
    target = event.shiftKey ? last : first
  } else if (!items.includes(active)) {
    // Focus sits on something Tab doesn't stop at (the panel itself, a tabindex="-1"
    // element…): move to its tabbable neighbour, wrapping around at the ends.
    target = event.shiftKey
      ? (items.findLast((item) => isBefore(item, active)) ?? last)
      : (items.find((item) => isBefore(active, item)) ?? first)
  } else if (event.shiftKey && active === first) {
    target = last
  } else if (!event.shiftKey && active === last) {
    target = first
  }

  // Everywhere else the browser's own Tab order already stays inside the panel.
  if (target) {
    event.preventDefault()
    target.focus()
  }
}

/** True when `a` comes before `b` in document order (a container comes before its children). */
function isBefore(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}
