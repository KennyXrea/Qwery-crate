/**
 * Rendering helpers for component and page tests: everything the app wraps pages in (React
 * Query, the router, toasts), fresh for every call so nothing leaks between tests.
 *
 *   renderWithProviders(<LevelCard level={TEST_LEVELS[0]} />)
 *   renderWithProviders(<LevelPage />, { path: '/level/:slug', route: '/level/sample-level-1' })
 *   renderApp('/list?section=extended')        // the real route table, header and all
 *
 * Pair them with mockApiDefaults() from ./api-mocks for data (no network is ever used: see
 * setup.ts).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter } from 'react-router'
import type { RouteObject } from 'react-router'
// The same RouterProvider the app uses (App.tsx).
import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from '../components/ui/ToastProvider'
import { routes } from '../routes'

/**
 * A React Query client for one test: no retries (an error shows at once), no refetching on
 * focus, and cached data is never shared with another test.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export type RenderWithProvidersOptions = {
  /** The address to start at, e.g. '/level/sample-level-1?tab=records'. Default '/'. */
  route?: string
  /** The route pattern `ui` is mounted at, so useParams works, e.g. '/level/:slug'. Default '*'. */
  path?: string
  /** Pass one to inspect or pre-fill the cache; a fresh one is made otherwise. */
  queryClient?: QueryClient
}

function renderRouter(router: ReturnType<typeof createMemoryRouter>, queryClient: QueryClient) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}

/**
 * Renders `ui` inside the providers every page has: a fresh QueryClient (retry off), a memory
 * router (starting at `route`, with `ui` mounted at `path`) and the ToastProvider.
 * Returns Testing Library's result plus `router` (check `router.state.location`, or
 * `router.navigate(…)`) and `queryClient`.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    path = '*',
    queryClient = createTestQueryClient(),
  }: RenderWithProvidersOptions = {},
) {
  const router = createMemoryRouter([{ path, element: ui }], { initialEntries: [route] })
  return renderRouter(router, queryClient)
}

/**
 * Renders the whole app (src/routes.tsx: site layout, header, every page) at `route` with
 * fresh providers. Lazy pages (admin, dev) take a moment: use findBy… with a longer timeout.
 */
export function renderApp(
  route = '/',
  {
    queryClient = createTestQueryClient(),
    routeTable = routes,
  }: { queryClient?: QueryClient; routeTable?: RouteObject[] } = {},
) {
  const router = createMemoryRouter(routeTable, { initialEntries: [route] })
  return renderRouter(router, queryClient)
}
