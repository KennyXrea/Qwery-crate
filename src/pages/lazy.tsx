import { lazy, Suspense } from 'react'
import { NotFoundPage } from './NotFoundPage'
import { PageLoader } from './PageLoader'

/*
 * Pages that most visitors never open are split into their own files, so the public
 * site doesn't download admin or developer code. Each wrapper adds the loading fallback.
 */

const AdminLoginPage = lazy(() =>
  import('./admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
)

const AdminPlaceholderPage = lazy(() =>
  import('./admin/AdminPlaceholderPage').then((m) => ({ default: m.AdminPlaceholderPage })),
)

// `import.meta.env.DEV` is replaced with `false` in production builds, so this branch
// (and the UI kit chunk) is removed from the published site entirely.
const UiKitPage = import.meta.env.DEV
  ? lazy(() => import('./dev/UiKitPage').then((m) => ({ default: m.UiKitPage })))
  : null

export function AdminLoginRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLoginPage />
    </Suspense>
  )
}

export function AdminPlaceholderRoute() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <AdminPlaceholderPage />
    </Suspense>
  )
}

export function UiKitRoute() {
  if (!UiKitPage) return <NotFoundPage />
  return (
    <Suspense fallback={<PageLoader />}>
      <UiKitPage />
    </Suspense>
  )
}
