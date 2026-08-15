import { QueryClient } from "@tanstack/react-query"

/*
 * REST cache for config-shaped data: cameras, DVR settings, members, channels,
 * event history. Live event traffic arrives over WebSocket instead, so window
 * focus refetching is off — it would re-pull data the socket already pushed.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
