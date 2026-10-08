import { QueryClient } from '@tanstack/react-query'

/**
 * A React Query client with the app's defaults: data stays fresh for a minute, a failed
 * request is retried once, and switching back to the browser tab doesn't refetch.
 * Tests create their own client so cached data never leaks between them.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/** The one client the app uses (App.tsx provides it). */
export const queryClient = createQueryClient()
