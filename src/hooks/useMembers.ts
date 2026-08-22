import { useQuery } from "@tanstack/react-query"
import * as membersApi from "@/api/members"
import { useSessionStore } from "@/stores/sessionStore"
import type { MemberListResponse } from "@/lib/schemas"

export const memberKeys = {
  list: ["members", "list"] as const,
}

/** Disabled while logged out: the route needs the bearer token. */
export function useMembers() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery<MemberListResponse>({
    queryKey: memberKeys.list,
    queryFn: membersApi.listMembers,
    enabled: isLoggedIn,
  })
}
