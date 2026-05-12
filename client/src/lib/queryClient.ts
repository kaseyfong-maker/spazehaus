/*
 * SPAZEHAUS — Shared TanStack Query client
 *
 * Configured for an internal management app:
 * - 30s staleTime: re-fetches when the user comes back from another tab
 *   but not on every navigation
 * - retry: 1 — most failures are network blips; one retry is enough
 * - refetchOnWindowFocus: true — picks up changes from teammates
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
