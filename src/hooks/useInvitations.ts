import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import * as invitationsApi from "@/api/invitations"
import { openSession } from "@/hooks/useAuth"
import { enterSpace } from "@/hooks/useSpaces"
import { ApiError } from "@/lib/http"
import { type TranslationKey } from "@/lib/i18n"
import { useCan } from "@/lib/permissions"
import type { InvitationListResponse, MeResponse } from "@/lib/schemas"

export const invitationKeys = {
  pending: ["invitations", "pending"] as const,
  mine: ["invitations", "mine"] as const,
  preview: (token: string) => ["invitations", "preview", token] as const,
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

export function useInvitationPreview(token: string | null, enabled = true) {
  return useQuery({
    queryKey: invitationKeys.preview(token ?? ""),
    queryFn: () => invitationsApi.previewInvitation(token!),
    enabled: token !== null && enabled,
    retry: false, // a 404 is an answer, not a blip
  })
}

export function useMyInvitations() {
  return useQuery({ queryKey: invitationKeys.mine, queryFn: invitationsApi.listMyInvitations })
}

/** Accept answers a token for the invited space: same entry path as a space switch. */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation<MeResponse, unknown, string>({
    mutationFn: async (id) => enterSpace(queryClient, await invitationsApi.acceptInvitation(id)),
    onSuccess: () => navigate("/"),
  })
}

/** me() first (pendingInvitationsCount), then the list; sequential so the request order is fixed. */
export function useDeclineInvitation() {
  const queryClient = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: invitationsApi.declineInvitation,
    onSuccess: async () => {
      await openSession()
      await queryClient.invalidateQueries({ queryKey: invitationKeys.mine })
    },
  })
}

export function invitationActionErrorKey(error: unknown): TranslationKey {
  return error instanceof ApiError && error.status === 409 ? "invitations.gone" : "errors.generic"
}
