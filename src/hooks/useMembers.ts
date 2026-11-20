import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as membersApi from "@/api/members"
import type { UpdateMemberPayload } from "@/api/members"
import { useCan } from "@/lib/permissions"
import { useSessionStore } from "@/stores/sessionStore"
import type { MemberListResponse, MemberResponse } from "@/lib/schemas"

export const memberKeys = {
  list: ["members", "list"] as const,
}

/** Disabled while logged out or without the members section. */
export function useMembers() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)
  const { canView } = useCan()

  return useQuery<MemberListResponse>({
    queryKey: memberKeys.list,
    queryFn: membersApi.listMembers,
    // GET /members needs the members section; Channels and Events read the roster too.
    enabled: isLoggedIn && canView("members"),
  })
}

/**
 * Admin only. Optimistic for the same reason the routing matrix is: the switch
 * is the only feedback the operator gets, there is no save button behind it.
 */
export function useSetMemberAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, receiveAlerts }: { userId: number; receiveAlerts: boolean }) =>
      membersApi.updateMember(userId, { receiveAlerts }),
    onMutate: async ({ userId, receiveAlerts }) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.list })
      const previous = queryClient.getQueryData<MemberListResponse>(memberKeys.list)
      queryClient.setQueryData<MemberListResponse>(
        memberKeys.list,
        (current) =>
          current && {
            ...current,
            items: current.items.map((member) =>
              member.id === userId ? { ...member, receiveAlerts } : member,
            ),
          },
      )
      return { previous }
    },
    // Rolled back row by row, not by restoring the whole snapshot: PATCH writes
    // one member, so two toggles in flight together would otherwise let the
    // loser's rollback undo the winner's confirmed state.
    onError: (_error, { userId }, context) => {
      const stored = context?.previous?.items.find((member) => member.id === userId)
      if (!stored) return
      queryClient.setQueryData<MemberListResponse>(
        memberKeys.list,
        (current) =>
          current && {
            ...current,
            items: current.items.map((member) => (member.id === userId ? stored : member)),
          },
      )
    },
    onSuccess: (updated: MemberResponse) =>
      queryClient.setQueryData<MemberListResponse>(
        memberKeys.list,
        (current) =>
          current && {
            ...current,
            items: current.items.map((member) => (member.id === updated.id ? updated : member)),
          },
      ),
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, ...patch }: { userId: number } & UpdateMemberPayload) =>
      membersApi.updateMember(userId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.list }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: membersApi.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.list }),
  })
}
