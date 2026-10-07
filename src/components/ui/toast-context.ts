import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastOptions = {
  /** A second, quieter line under the title. */
  description?: string
  /**
   * How long it stays, in milliseconds. Defaults: success/info 5s, error 8s.
   * `0` or `Infinity` keeps it until the user dismisses it.
   */
  duration?: number
}

export type ToastInput = { tone: ToastTone; title: string } & ToastOptions

/** A toast as stored by the provider. */
export type ToastItem = ToastInput & { id: string; duration: number }

export type ToastApi = {
  /** Shows a toast and returns its id (for `dismiss`). */
  show(toast: ToastInput): string
  success(title: string, options?: ToastOptions): string
  error(title: string, options?: ToastOptions): string
  info(title: string, options?: ToastOptions): string
  /** Removes a toast early. Unknown or already-gone ids are ignored. */
  dismiss(id: string): void
}

export const DEFAULT_TOAST_DURATION: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  error: 8000,
}

/** At most this many toasts are on screen; showing another drops the oldest. */
export const MAX_VISIBLE_TOASTS = 4

let toastCounter = 0

/** A unique toast id (a plain counter — no randomness). */
export function nextToastId(): string {
  toastCounter += 1
  return `toast-${toastCounter}`
}

export const ToastContext = createContext<ToastApi | null>(null)
