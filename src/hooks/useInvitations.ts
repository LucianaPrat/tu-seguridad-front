import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as authApi from "@/api/auth"
import * as invitationsApi from "@/api/invitations"
import { useCan } from "@/lib/permissions"
import { useSessionStore } from "@/stores/sessionStore"
import type { InvitationListResponse, MeResponse } from "@/lib/schemas"

export const invitationKeys = {
  pending: ["invitations", "pending"] as const,
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: invitationsApi.createInvitation,
    // The roster does not change — the invitee is not a member yet — but the
    // pending list does, and the Members screen renders it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.pending }),
  })
}

/**
 * The back gates this on the members section, same as GET /members, so it
 * stays disabled without that section instead of rendering a 403.
 */
export function usePendingInvitations() {
  const { canView } = useCan()

  return useQuery<InvitationListResponse>({
    queryKey: invitationKeys.pending,
    queryFn: invitationsApi.listPendingInvitations,
    enabled: canView("members"),
  })
}

/*
 * A query rather than a mutation, keyed by the token: the accept page fires this
 * on mount, and React StrictMode mounts twice in dev. Two mutate() calls would
 * spend a single-use token twice — and a mutation started inside the first
 * effect never delivers its result to the observer the second mount leaves
 * behind, so the screen sits on "pending" forever. Query deduplication answers
 * both: one request, one cached result, whichever mount is alive reads it.
 *
 * Body is otherwise useLogin's: the token has to land in the store before me()
 * runs, since that is where the request layer reads the header from.
 */
export function useAcceptInvitation(token: string | null) {
  return useQuery<MeResponse>({
    queryKey: ["invitations", "accept", token],
    enabled: token !== null,
    retry: false,
    // The token is spent: a refetch could only ever answer 401.
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const store = useSessionStore.getState()
      store.setAccessToken(await invitationsApi.acceptInvitation(token!))
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

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: invitationsApi.revokeInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.pending }),
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: invitationsApi.resendInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.pending }),
  })
}
