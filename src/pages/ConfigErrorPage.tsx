import { useEffect } from 'react'
import { Button } from '../components/ui/Button'

type ConfigErrorPageProps = {
  problems: string[]
  /** Defaults to "Configuration error", or "The site failed to load" for `kind="load"`. */
  title?: string
  /**
   * - `config` (default): the Supabase settings are missing or wrong; explains how to fix them.
   * - `load`: the site's code could not be downloaded or crashed while starting; offers a
   *   reload instead of setup steps.
   */
  kind?: 'config' | 'load'
}

/**
 * Full-page explanation shown instead of the app when it can't start: the Supabase settings
 * are missing or wrong, or its code failed to load. Rendered outside the router, so it only
 * uses plain markup and router-free components.
 */
export function ConfigErrorPage({ problems, title, kind = 'config' }: ConfigErrorPageProps) {
  const isLoadError = kind === 'load'
  const heading = title ?? (isLoadError ? 'The site failed to load' : 'Configuration error')

  useEffect(() => {
    document.title = `${heading} — Qwerty Crate`
  }, [heading])

  const isLocal = import.meta.env.DEV

  return (
    <main className="page-container flex min-h-dvh items-center py-12">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
        <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
          Qwerty Crate
        </p>
        <h1 className="mt-2 text-3xl font-bold text-text">{heading}</h1>
        <p className="mt-3 text-muted">
          {isLoadError
            ? 'Something went wrong while loading the site:'
            : "The site can't start because some of its settings are missing or wrong:"}
        </p>

        <ul role="alert" className="mt-4 space-y-2">
          {problems.map((problem) => (
            <li
              key={problem}
              className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm wrap-break-word text-text"
            >
              {problem}
            </li>
          ))}
        </ul>

        {isLoadError ? (
          <Button onClick={() => window.location.reload()} className="mt-8 w-full sm:w-auto">
            Reload page
          </Button>
        ) : (
          <SetupHelp isLocal={isLocal} />
        )}
      </div>
    </main>
  )
}

/** Step-by-step fix for missing or wrong Supabase settings. */
function SetupHelp({ isLocal }: { isLocal: boolean }) {
  return (
    <>
      <h2 className="mt-8 text-lg font-semibold text-text">How to fix it</h2>
      {isLocal ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted marker:text-accent">
          <li>
            In the project folder, make a copy of <Code>.env.example</Code> and name the copy{' '}
            <Code>.env.local</Code>.
          </li>
          <li>
            Open <Code>.env.local</Code> and paste in your{' '}
            <strong className="text-text">Project URL</strong> and{' '}
            <strong className="text-text">Publishable key</strong> from Supabase → Project Settings
            → API Keys.
          </li>
          <li>
            Never paste the <strong className="text-danger">secret</strong> (service_role) key — it
            must not go in the website.
          </li>
          <li>
            Save the file, stop the dev server (<Code>Ctrl</Code> + <Code>C</Code> in the terminal)
            and run <Code>npm run dev</Code> again.
          </li>
        </ol>
      ) : (
        <p className="mt-3 text-muted">
          Site owner: add <Code>VITE_SUPABASE_URL</Code> and{' '}
          <Code>VITE_SUPABASE_PUBLISHABLE_KEY</Code> in Netlify → Site configuration → Environment
          variables, then trigger a new deploy.
        </p>
      )}
    </>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] whitespace-nowrap text-text">
      {children}
    </code>
  )
}
