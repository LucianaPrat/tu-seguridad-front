import { useInfiniteQuery } from "@tanstack/react-query"
import * as eventsApi from "@/api/events"
import { useSessionStore } from "@/stores/sessionStore"
import type { ListEventsParams } from "@/api/events"

export const eventKeys = {
  list: (filters: ListEventsParams) => ["events", "list", filters] as const,
}

/**
 * Keyset paged, so the cursor is the only thing that advances. Filters are part
 * of the key: changing one is a different query that starts from the newest
 * event again, which is also what discards the old cursors.
 */
export function useEvents(filters: ListEventsParams = {}) {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useInfiniteQuery({
    queryKey: eventKeys.list(filters),
    queryFn: ({ pageParam }) => eventsApi.listEvents({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isLoggedIn,
  })
}
