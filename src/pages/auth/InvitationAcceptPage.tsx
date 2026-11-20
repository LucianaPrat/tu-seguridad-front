import { Link, useNavigate, useSearchParams } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import Button from "@/components/common/Button"
import {
  invitationActionErrorKey,
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitationPreview,
} from "@/hooks/useInvitations"
import { useLogout } from "@/hooks/useAuth"
import { ApiError } from "@/lib/http"
import { ROLE_LABELS } from "@/lib/permissions"
import { useT } from "@/hooks/useT"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Where the invitation email lands: the backend builds
 * ${APP_BASE_URL}/invitations/accept?token=… and the token is the credential,
 * so this route is public. Logged out, it shows who invited the user and one
 * button towards login or register; logged in as the invitee, accept/decline.
 */
export default function InvitationAcceptPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token")
  const { isLoggedIn, user } = useSessionStore()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const logout = useLogout()
  // Paused while accepting: enterSpace wipes the cache, and a refetch would 404 on the spent invitation.
  const preview = useInvitationPreview(token, !accept.isPending && !accept.isSuccess)

  if (!token) {
    return (
      <AuthCard
        title={t("auth.invitation.invalidTitle")}
        subtitle={t("auth.invitation.invalidSubtitle")}
      >
        <p className="text-sm text-secondary-foreground">{t("auth.invitation.invalidBody")}</p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center text-sm text-primary hover:underline py-2"
        >
          {t("common.goToLogin")}
        </Link>
      </AuthCard>
    )
  }

  if (preview.isPending) {
    return (
      <AuthCard title={t("auth.invitation.title")}>
        <p className="text-sm text-secondary-foreground">{t("auth.invitation.validating")}</p>
      </AuthCard>
    )
  }

  if (preview.isError) {
    const gone = preview.error instanceof ApiError && preview.error.status === 404
    return (
      <AuthCard title={t("auth.invitation.title")}>
        <p role="alert" className="text-sm text-destructive">
          {t(gone ? "invitations.gone" : "auth.invitation.failed")}
        </p>
        <Link
          to={isLoggedIn ? "/" : "/login"}
          className="mt-4 inline-flex items-center text-sm text-primary hover:underline py-2"
        >
          {t(isLoggedIn ? "common.backToStart" : "common.goToLogin")}
        </Link>
      </AuthCard>
    )
  }

  const invite = preview.data
  const here = `/invitations/accept?${new URLSearchParams({ token })}`
  const sameEmail = user?.email.toLowerCase() === invite.email.toLowerCase()
  const actionError = accept.error ?? decline.error

  return (
    <AuthCard title={t("auth.invitation.title")}>
      <p className="text-sm text-secondary-foreground">
        {t("invitations.summary", {
          inviter: invite.invitedByName,
          space: invite.spaceName,
          role: t(ROLE_LABELS[invite.role]),
        })}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {!isLoggedIn ? (
          invite.userExists ? (
            <Button
              className="w-full"
              onClick={() =>
                navigate(`/login?${new URLSearchParams({ email: invite.email, next: here })}`)
              }
            >
              {t("auth.invitation.signIn")}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                navigate(
                  `/register?${new URLSearchParams({ inviteToken: token, email: invite.email })}`,
                )
              }
            >
              {t("auth.invitation.register")}
            </Button>
          )
        ) : sameEmail ? (
          <>
            {actionError != null && (
              <p role="alert" className="text-sm text-destructive">
                {t(invitationActionErrorKey(actionError))}
              </p>
            )}
            <Button
              className="w-full"
              loading={accept.isPending}
              disabled={decline.isPending}
              onClick={() => accept.mutate(invite.id)}
            >
              {t("invitations.accept")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              loading={decline.isPending}
              disabled={accept.isPending}
              onClick={() => decline.mutate(invite.id, { onSuccess: () => navigate("/") })}
            >
              {t("invitations.decline")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-secondary-foreground">
              {t("auth.invitation.otherEmail", { email: invite.email })}
            </p>
            <Button
              variant="secondary"
              className="w-full"
              loading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {t("nav.logout")}
            </Button>
          </>
        )}
      </div>
    </AuthCard>
  )
}
