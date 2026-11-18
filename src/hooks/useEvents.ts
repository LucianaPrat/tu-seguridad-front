import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as eventsApi from "@/api/events"
import { useSessionStore } from "@/stores/sessionStore"
import type { ListEventsParams } from "@/api/events"

export const eventKeys = {
  list: (filters: ListEventsParams) => ["events", "list", filters] as const,
  detail: (id: string) => ["events", "detail", id] as const,
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

/**
 * One alert for the detail screen. Its own fetch rather than a lookup in the
 * loaded list pages: the emailed "Ver la alerta" button lands here cold, on an
 * event that may sit many pages back, or on none that were fetched at all.
 */
export function useEvent(id: string) {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsApi.getEvent(id),
    enabled: isLoggedIn && id !== "",
  })
}

/**
 * Acknowledging from the link in an alert email. Not a query and not cached:
 * it runs once, when the recipient presses the button, and the page renders
 * straight off the mutation's own state.
 *
 * The event list is invalidated on success so an operator who *is* logged in
 * sees the row flip without a reload. Harmless when nobody is: an invalidated
 * key with no observer refetches nothing.
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string) => eventsApi.acknowledgeAlert(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  })
}
