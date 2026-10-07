import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { envResult } from './lib/env'
import { describeStartupError } from './lib/load-error'
import { ConfigErrorPage } from './pages/ConfigErrorPage'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('index.html is missing the #root element')
const root = createRoot(container)

if (envResult.ok) {
  // The app (and everything that talks to Supabase) is only loaded once the config is
  // known to be valid, so a bad .env.local can never crash the page before we explain it.
  try {
    const { App } = await import('./App')
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    // A download failure (or a crash while the app's code starts up), not a settings problem.
    console.error(error)
    const problems = [describeStartupError(error)]
    // While developing, also show the error itself (it's in the browser console too).
    if (import.meta.env.DEV) problems.push(String(error))
    root.render(
      <StrictMode>
        <ConfigErrorPage kind="load" problems={problems} />
      </StrictMode>,
    )
  }
} else {
  root.render(
    <StrictMode>
      <ConfigErrorPage problems={envResult.problems} />
    </StrictMode>,
  )
}
