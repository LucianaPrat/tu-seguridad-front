import Button from "@/components/common/Button"
import {
  invitationActionErrorKey,
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from "@/hooks/useInvitations"
import { useT } from "@/hooks/useT"
import { ROLE_LABELS } from "@/lib/permissions"

export default function MyInvitationsList() {
  const { t } = useT()
  const { data, isPending, isError } = useMyInvitations()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const busy = accept.isPending || decline.isPending
  const actionError = accept.error ?? decline.error

  if (isPending) return null
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("invitations.loadFailed")}
      </p>
    )
  }
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("invitations.empty")}</p>
  }
  return (
    <div className="space-y-3">
      {actionError != null && (
        <p role="alert" className="text-sm text-destructive">
          {t(invitationActionErrorKey(actionError))}
        </p>
      )}
      <ul className="space-y-3">
        {data.map((inv) => (
          <li
            key={inv.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3"
          >
            <p className="flex-1 min-w-0 text-sm text-gray-900">
              {t("invitations.summary", {
                inviter: inv.invitedByName,
                space: inv.spaceName,
                role: t(ROLE_LABELS[inv.role]),
              })}
            </p>
            <Button
              variant="secondary"
              disabled={busy}
              loading={decline.isPending && decline.variables === inv.id}
              onClick={() => decline.mutate(inv.id)}
            >
              {t("invitations.decline")}
            </Button>
            <Button
              disabled={busy}
              loading={accept.isPending && accept.variables === inv.id}
              onClick={() => accept.mutate(inv.id)}
            >
              {t("invitations.accept")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
