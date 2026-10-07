import { createBrowserRouter } from 'react-router'
import { routes } from './routes'

/** The app's router. The route table lives in routes.tsx so tests can reuse it. */
export const router = createBrowserRouter(routes)
