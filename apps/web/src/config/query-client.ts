import { QueryClient } from '@tanstack/react-query';

/**
 * One QueryClient for the whole app (migration guide §5). Defaults are
 * deliberately conservative for a clinical, data-heavy app: a moderate
 * staleTime avoids re-fetching on every remount, and a capped retry count
 * avoids hammering the portal API when it's genuinely down — services
 * already turn axios failures into typed ApiErrors (via @ezazi/api-client's
 * mapAxiosError), so callers can branch on `error.kind` instead of relying
 * on blind retries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
