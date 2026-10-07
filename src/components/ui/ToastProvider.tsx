import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { IconAlert, IconCheck, IconClose, IconInfo } from './icons'
import {
  DEFAULT_TOAST_DURATION,
  MAX_VISIBLE_TOASTS,
  ToastContext,
  nextToastId,
} from './toast-context'
import type { ToastApi, ToastInput, ToastItem, ToastTone } from './toast-context'

/**
 * Holds the toasts and renders them in a corner of the screen (bottom-center on phones,
 * bottom-right on wider screens). Use `useToast()` anywhere below it to show one.
 *
 * Screen readers: success/info toasts go into a polite live region and errors into an
 * assertive `role="alert"` region. Both regions are always in the page, even when empty,
 * because screen readers only announce changes to live regions they already know about.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const pageVisible = useSyncExternalStore(subscribeToVisibility, isPageVisible, () => true)
  const regionRef = useRef<HTMLElement>(null)
  // Where keyboard focus was before it moved into the notifications, to go back to afterwards.
  const focusBeforeRegion = useRef<HTMLElement | null>(null)

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.some((toast) => toast.id === id)
        ? current.filter((toast) => toast.id !== id)
        : current,
    )
  }, [])

  // A toast closed by the person (its button or Escape). If it holds keyboard focus, move focus
  // somewhere sensible first, so it doesn't drop to the top of the page with the toast.
  const dismissFromCard = useCallback(
    (id: string, card: HTMLElement) => {
      moveFocusOutOf(card, regionRef.current, focusBeforeRegion.current)
      dismiss(id)
    },
    [dismiss],
  )

  function handleRegionFocus(event: FocusEvent<HTMLElement>) {
    const from = event.relatedTarget
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
      focusBeforeRegion.current = from
    }
  }

  const show = useCallback(({ tone, title, description, duration }: ToastInput) => {
    const toast: ToastItem = {
      id: nextToastId(),
      tone,
      title,
      description,
      duration: duration ?? DEFAULT_TOAST_DURATION[tone],
    }
    setToasts((current) => {
      // Showing the same message again replaces it (restarting its timer) instead of stacking.
      const others = current.filter(
        (other) =>
          !(other.tone === tone && other.title === title && other.description === description),
      )
      return [...others, toast].slice(-MAX_VISIBLE_TOASTS)
    })
    return toast.id
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, options) => show({ ...options, tone: 'success', title }),
      error: (title, options) => show({ ...options, tone: 'error', title }),
      info: (title, options) => show({ ...options, tone: 'info', title }),
    }),
    [show, dismiss],
  )

  const statusToasts = toasts.filter((toast) => toast.tone !== 'error')
  const errorToasts = toasts.filter((toast) => toast.tone === 'error')

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        <section
          ref={regionRef}
          aria-label="Notifications"
          onFocus={handleRegionFocus}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6 sm:pb-6"
        >
          <div
            aria-live="polite"
            aria-relevant="additions text"
            aria-atomic="false"
            className="flex w-full max-w-sm flex-col gap-2"
          >
            {statusToasts.map((toast) => (
              <ToastCard
                key={toast.id}
                toast={toast}
                pageVisible={pageVisible}
                onDismiss={dismissFromCard}
              />
            ))}
          </div>
          <div
            role="alert"
            aria-live="assertive"
            aria-relevant="additions text"
            aria-atomic="false"
            className="flex w-full max-w-sm flex-col gap-2 not-empty:mt-2"
          >
            {errorToasts.map((toast) => (
              <ToastCard
                key={toast.id}
                toast={toast}
                pageVisible={pageVisible}
                onDismiss={dismissFromCard}
              />
            ))}
          </div>
        </section>,
        document.body,
      )}
    </ToastContext>
  )
}

const TONE_CLASSES: Record<ToastTone, { card: string; icon: string }> = {
  success: { card: 'border-success/30', icon: 'bg-success/15 text-success' },
  error: { card: 'border-danger/40', icon: 'bg-danger/15 text-danger' },
  info: { card: 'border-accent/30', icon: 'bg-accent/15 text-accent' },
}

type ToastCardProps = {
  toast: ToastItem
  pageVisible: boolean
  /** Removes the toast; `card` is its element, so focus can be moved out of it first. */
  onDismiss: (id: string, card: HTMLElement) => void
}

function ToastCard({ toast, pageVisible, onDismiss }: ToastCardProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // Time left on the clock; it only runs while the toast is visible and not being read.
  const remaining = useRef(toast.duration)

  function close() {
    if (cardRef.current) onDismiss(toast.id, cardRef.current)
  }
  const expire = useEffectEvent(close)

  const autoDismiss = Number.isFinite(toast.duration) && toast.duration > 0
  const paused = hovered || focused || !pageVisible

  useEffect(() => {
    if (!autoDismiss || paused) return
    const startedAt = Date.now()
    const timer = window.setTimeout(() => expire(), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [autoDismiss, paused])

  // Hover pauses only for a real mouse: on touch screens "pointerleave" may never come.
  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') setHovered(true)
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    // Claim the key so an open dialog underneath doesn't close as well.
    event.preventDefault()
    event.stopPropagation()
    close()
  }

  const tone = TONE_CLASSES[toast.tone]

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        'pointer-events-auto flex w-full animate-slide-up items-start gap-3 rounded-xl border bg-surface p-3 pl-4 shadow-lg shadow-black/40',
        tone.card,
      )}
    >
      <span
        className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone.icon)}
      >
        <ToneIcon tone={toast.tone} />
      </span>
      <div className="min-w-0 flex-1 py-1.5">
        <p id={titleId} className="text-sm font-semibold break-words text-text">
          {toast.title}
        </p>
        {toast.description ? (
          <p className="mt-0.5 text-sm break-words text-muted">{toast.description}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Dismiss notification"
        // Tells several "Dismiss notification" buttons apart: each is described by its title.
        aria-describedby={titleId}
        data-toast-dismiss=""
        onClick={close}
        className="-my-1 -mr-1"
      >
        <IconClose />
      </Button>
    </div>
  )
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  switch (tone) {
    case 'success':
      return <IconCheck className="size-4" />
    case 'error':
      return <IconAlert className="size-4" />
    case 'info':
      return <IconInfo className="size-4" />
  }
}

/**
 * If keyboard focus is inside `card` (about to be removed), moves it to the next toast's dismiss
 * button (or the previous one), else back to where it was before entering the notifications,
 * else to the page's main content.
 */
function moveFocusOutOf(
  card: HTMLElement,
  region: HTMLElement | null,
  focusBeforeRegion: HTMLElement | null,
): void {
  if (!card.contains(document.activeElement)) return

  const otherButtons = Array.from(
    region?.querySelectorAll<HTMLElement>('[data-toast-dismiss]') ?? [],
  ).filter((button) => !card.contains(button))
  const nextButton =
    otherButtons.find(
      (button) => card.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ) ?? otherButtons.at(-1)

  for (const target of [nextButton, focusBeforeRegion, document.getElementById('main')]) {
    if (!target?.isConnected) continue
    target.focus({ preventScroll: target.id === 'main' })
    // focus() silently does nothing on hidden or inert elements: then try the next one.
    if (document.activeElement === target) return
  }
}

function subscribeToVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

function isPageVisible(): boolean {
  return document.visibilityState !== 'hidden'
}
