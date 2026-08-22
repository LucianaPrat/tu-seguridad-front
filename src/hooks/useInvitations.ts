import { useMutation } from "@tanstack/react-query"
import * as invitationsApi from "@/api/invitations"

/** Nothing in the cache lists invitations, so there is nothing to invalidate. */
export function useCreateInvitation() {
  return useMutation({ mutationFn: invitationsApi.createInvitation })
}
