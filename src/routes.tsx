import type { RouteObject } from 'react-router'
import { RootLayout } from './components/layout/RootLayout'
import { AboutPage } from './pages/AboutPage'
import { HomePage } from './pages/HomePage'
import { AdminLoginRoute, AdminPlaceholderRoute, UiKitRoute } from './pages/lazy'
import { LevelPage } from './pages/LevelPage'
import { ListPage } from './pages/ListPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlayerPage } from './pages/PlayerPage'
import { PlayersPage } from './pages/PlayersPage'
import { RecentPage } from './pages/RecentPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { StatsPage } from './pages/StatsPage'

/** Developer-only pages. `import.meta.env.DEV` is `false` in production builds, so they disappear. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'dev/ui', element: <UiKitRoute /> }]
  : []

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'list', element: <ListPage /> },
      { path: 'level/:slug', element: <LevelPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'player/:slug', element: <PlayerPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'recent', element: <RecentPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'admin/login', element: <AdminLoginRoute /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // The admin area has its own layout, so it sits outside the public site's RootLayout.
    path: '/admin/*',
    element: <AdminPlaceholderRoute />,
    errorElement: <RouteErrorPage />,
  },
]
