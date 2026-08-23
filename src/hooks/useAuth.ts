import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as authApi from "@/api/auth"
import { ApiError } from "@/lib/http"
import { useSessionStore } from "@/stores/sessionStore"
import type { CompleteProfileValues, LoginValues, MeResponse } from "@/lib/schemas"

/** What the route takes: the form's repeated password never leaves the browser. */
export type CompleteProfilePayload = Omit<CompleteProfileValues, "repeatPassword">

export const authKeys = {
  session: ["auth", "session"] as const,
}

/**
 * Restores the session on boot. The HttpOnly refresh cookie is the only thing
 * that survives a reload, so this trades it for a fresh access token and then
 * loads the profile. A 401 just means nobody is logged in.
 *
 * Disabled once authStatus settles, so it never re-runs over a live session.
 */
export function useSessionBootstrap() {
  const authStatus = useSessionStore((state) => state.authStatus)

  return useQuery<MeResponse | null>({
    queryKey: authKeys.session,
    enabled: authStatus === "unknown",
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const store = useSessionStore.getState()
      try {
        store.setAccessToken(await authApi.refresh())
        const profile = await authApi.me()
        store.setSession(profile)
        return profile
      } catch (error) {
        // logout() also flips authStatus to "ready", which opens the gate.
        store.logout()
        if (error instanceof ApiError) return null
        throw error
      }
    },
  })
}

export function useLogin() {
  return useMutation<MeResponse, unknown, LoginValues>({
    mutationFn: async (values) => {
      const store = useSessionStore.getState()
      // The token has to land in the store before me() runs — that is where
      // the request layer reads the Authorization header from.
      store.setAccessToken(await authApi.login(values))
      try {
        const profile = await authApi.me()
        store.setSession(profile)
        return profile
      } catch (error) {
        // A token with no profile is a half-open session; drop it.
        store.logout()
        throw error
      }
    },
  })
}

/*
 * Sends the missing profile fields, then rebuilds the session off the token the
 * route answers with — its claims are what the backend's profile gate reads.
 *
 * A 409 means somebody already completed this profile (a second tab), and the
 * access token in hand still claims otherwise, which would bounce the operator
 * between the gate and the form forever. Trading the refresh cookie for a fresh
 * token is what breaks that loop.
 */
export function useCompleteProfile() {
  return useMutation<MeResponse, unknown, CompleteProfilePayload>({
    mutationFn: async (payload) => {
      const store = useSessionStore.getState()
      try {
        store.setAccessToken(await authApi.completeProfile(payload))
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error
        store.setAccessToken(await authApi.refresh())
      }
      try {
        const profile = await authApi.me()
        store.setSession(profile)
        return profile
      } catch (error) {
        store.logout()
        throw error
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    // onSettled, not onSuccess: a dead network must still clear the session.
    onSettled: () => {
      useSessionStore.getState().logout()
      queryClient.clear()
    },
  })
}
