import { Link, Navigate, useSearchParams } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import { useAcceptInvitation } from "@/hooks/useInvitations"
import { ApiError } from "@/lib/http"
import { useT } from "@/hooks/useT"

/*
 * Where the invitation email lands: the backend builds
 * ${APP_BASE_URL}/invitations/accept?token=… and the token is the credential,
 * so this route is public.
 */
function acceptErrorMessage(error: unknown, t: ReturnType<typeof useT>["t"]) {
  if (error instanceof ApiError) {
    if (error.status === 401) return t("auth.invitation.linkUsed")
    if (error.status === 409) return error.message
  }
  return t("auth.invitation.failed")
}

export default function InvitationAcceptPage() {
  const { t } = useT()
  const [params] = useSearchParams()
  const token = params.get("token")
  // Fires on mount off the token alone — see useAcceptInvitation on why this is
  // a query and not a mutation.
  const accept = useAcceptInvitation(token)

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

  if (accept.isSuccess) {
    return <Navigate to={accept.data.profileCompleted ? "/" : "/onboarding/profile"} replace />
  }

  return (
    <AuthCard title={t("auth.invitation.title")} subtitle={t("auth.invitation.subtitle")}>
      {accept.isError ? (
        <>
          <p role="alert" className="text-sm text-destructive">
            {acceptErrorMessage(accept.error, t)}
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center text-sm text-primary hover:underline py-2"
          >
            {t("common.goToLogin")}
          </Link>
        </>
      ) : (
        <p className="text-sm text-secondary-foreground">{t("auth.invitation.validating")}</p>
      )}
    </AuthCard>
  )
}
