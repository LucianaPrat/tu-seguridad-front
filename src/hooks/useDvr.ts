import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as dvrApi from "@/api/dvr"
import { useSessionStore } from "@/stores/sessionStore"

export const dvrKeys = {
  current: ["dvr"] as const,
}

/** Probe writes nothing server-side, so there is no cache to invalidate. */
export function useTestDvrConnection() {
  return useMutation({ mutationFn: dvrApi.testConnection })
}

export function useConfigureDvr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dvrApi.configureDvr,
    onSuccess: (dvr) => {
      queryClient.setQueryData(dvrKeys.current, dvr)
      // The gate reads currentSpace.hasDvr; flip it locally so "/" opens at once.
      const { user, updateUser } = useSessionStore.getState()
      if (user?.currentSpace) updateUser({ currentSpace: { ...user.currentSpace, hasDvr: true } })
    },
  })
}
