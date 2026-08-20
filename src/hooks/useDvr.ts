import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as dvrApi from "@/api/dvr"
import { useSessionStore } from "@/stores/sessionStore"
import type { DvrResponse } from "@/lib/schemas"

export const dvrKeys = {
  current: ["dvr"] as const,
}

/** Probe writes nothing server-side, so there is no cache to invalidate. */
export function useTestDvrConnection() {
  return useMutation({ mutationFn: dvrApi.testConnection })
}

/**
 * Single source of truth for "has this space initialized its DVR": `data` is
 * null when the backend answers 404. Disabled while logged out, so callers
 * must check the session first — a disabled query stays pending forever.
 */
export function useDvr() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery<DvrResponse | null>({
    queryKey: dvrKeys.current,
    queryFn: dvrApi.getDvr,
    enabled: isLoggedIn,
    // Recorder config only changes through useConfigureDvr, which seeds this
    // cache itself. Without this the gate re-reads it on every guarded route
    // mount past the 30s default.
    staleTime: Infinity,
  })
}

export function useConfigureDvr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dvrApi.configureDvr,
    // The response is the fresh recorder, so seed the cache instead of
    // invalidating: the DVR gate reads it on the very next render.
    onSuccess: (dvr) => queryClient.setQueryData(dvrKeys.current, dvr),
  })
}
