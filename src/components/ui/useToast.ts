import { use } from 'react'
import { ToastContext } from './toast-context'
import type { ToastApi } from './toast-context'

/**
 * Shows notifications: `const toast = useToast(); toast.success('Level saved')`.
 * The returned object never changes, so it is safe to use in effect dependencies.
 */
export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) {
    throw new Error(
      'useToast() was called outside <ToastProvider>. Wrap the app (or the test) in <ToastProvider>.',
    )
  }
  return api
}
