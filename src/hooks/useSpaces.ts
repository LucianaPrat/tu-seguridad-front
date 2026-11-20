import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import * as authApi from "@/api/auth"
import * as spacesApi from "@/api/spaces"
import { openSession } from "@/hooks/useAuth"
import { useSessionStore } from "@/stores/sessionStore"
import type { MeResponse } from "@/lib/schemas"

/*
 * Queries are wiped BEFORE setSession: the re-render setSession causes is what
 * makes every mounted query rebuild against the empty cache and refetch for the
 * new space. Wiping after would delete the requests that render just started.
 * removeQueries, not clear(): clear() would also drop this very mutation.
 */
async function enterSpace(queryClient: QueryClient, accessToken: string): Promise<MeResponse> {
  queryClient.removeQueries()
  useSessionStore.getState().setAccessToken(accessToken)
  return openSession()
}

export function useSwitchSpace() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation<MeResponse, unknown, string>({
    mutationFn: async (spaceId) => enterSpace(queryClient, await authApi.switchSpace(spaceId)),
    onSuccess: () => navigate("/"),
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation<MeResponse, unknown, string>({
    mutationFn: async (name) => enterSpace(queryClient, await spacesApi.createSpace(name)),
    onSuccess: () => navigate("/"),
  })
}

/** Same session, same token: only the name changes, so no cache wipe or navigation. */
export function useRenameSpace() {
  return useMutation<MeResponse, unknown, string>({
    mutationFn: async (name) => {
      await spacesApi.renameSpace(name)
      return openSession()
    },
  })
}
