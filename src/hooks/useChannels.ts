import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as channelsApi from "@/api/channels"
import { useSessionStore } from "@/stores/sessionStore"
import type { AlertRouting } from "@/api/channels"

export const channelKeys = {
  routings: ["alert-routings"] as const,
}

/** Disabled while logged out: the route needs the bearer token. */
export function useAlertRoutings() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery<AlertRouting[]>({
    queryKey: channelKeys.routings,
    queryFn: channelsApi.listAlertRoutings,
    enabled: isLoggedIn,
  })
}

/**
 * Optimistic on purpose: the screen has no save button, so a checkbox that
 * waits for the round trip reads as a dead control. Rolled back if the write
 * fails, and the server's full matrix replaces the guess on success.
 */
export function useSetAlertRouting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (routing: AlertRouting) => channelsApi.saveAlertRoutings([routing]),
    onMutate: async (routing) => {
      await queryClient.cancelQueries({ queryKey: channelKeys.routings })
      const previous = queryClient.getQueryData<AlertRouting[]>(channelKeys.routings)
      queryClient.setQueryData<AlertRouting[]>(channelKeys.routings, (current) =>
        current?.map((cell) =>
          cell.alertType === routing.alertType && cell.channel === routing.channel ? routing : cell,
        ),
      )
      return { previous }
    },
    onError: (_error, _routing, context) => {
      queryClient.setQueryData(channelKeys.routings, context?.previous)
    },
    onSuccess: (matrix) => queryClient.setQueryData(channelKeys.routings, matrix),
  })
}
