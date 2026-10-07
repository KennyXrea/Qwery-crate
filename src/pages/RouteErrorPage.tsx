import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Logo } from '../components/layout/Logo'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'
import { IconAlert, IconHome } from '../components/ui/icons'
import { usePageTitle } from '../hooks/usePageTitle'
import { NotFoundContent } from './NotFoundContent'

/**
 * Shown by the router when a page crashes or a route reports an error.
 * It can replace the whole site layout, so it brings its own minimal header.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  usePageTitle(notFound ? 'Page not found' : 'Something went wrong')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-bg/80">
        <div className="page-container flex h-16 items-center">
          <Logo />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex flex-1 items-center py-8 outline-none">
        <div className="page-container">
          {notFound ? <NotFoundContent /> : <ErrorContent error={error} />}
        </div>
      </main>
    </div>
  )
}

function ErrorContent({ error }: { error: unknown }) {
  const status = isRouteErrorResponse(error) ? error.status : null
  const details = import.meta.env.DEV ? describeError(error) : null

  return (
    <div className="mx-auto flex max-w-xl animate-fade-in flex-col items-center py-10 text-center sm:py-16">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
        <IconAlert className="size-8" />
      </div>

      {status !== null && (
        <p className="mt-6 font-mono text-xs font-medium tracking-widest text-danger uppercase">
          Error {status}
        </p>
      )}
      <h1 className="mt-3 text-3xl font-bold text-text sm:text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted">
        This page ran into a problem and couldn't be shown. Reloading usually fixes it. If it keeps
        happening, let the site owner know.
      </p>

      {details && (
        <details className="mt-6 w-full rounded-xl border border-border bg-surface text-left">
          <summary className="flex min-h-10 cursor-pointer items-center px-4 text-sm font-medium text-muted hover:text-text">
            Error details (only shown while developing)
          </summary>
          <pre className="max-h-64 overflow-auto border-t border-border px-4 py-3 font-mono text-xs break-words whitespace-pre-wrap text-text">
            {details}
          </pre>
        </details>
      )}

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
          Reload page
        </Button>
        <ButtonLink
          to="/"
          variant="secondary"
          leftIcon={<IconHome />}
          reloadDocument
          className="w-full sm:w-auto"
        >
          Go home
        </ButtonLink>
      </div>
    </div>
  )
}

function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    const body = typeof error.data === 'string' ? error.data : JSON.stringify(error.data)
    return [`${error.status} ${error.statusText}`.trim(), body].filter(Boolean).join('\n')
  }
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error, null, 2) ?? 'Unknown error'
  } catch {
    return 'Unknown error'
  }
}
