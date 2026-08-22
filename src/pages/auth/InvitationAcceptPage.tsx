import { Link, Navigate, useSearchParams } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import { useAcceptInvitation } from "@/hooks/useInvitations"
import { ApiError } from "@/lib/http"

/*
 * Where the invitation email lands: the backend builds
 * ${APP_BASE_URL}/invitations/accept?token=… and the token is the credential,
 * so this route is public.
 */
function acceptErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "El enlace ya se usó o venció. Pedí una invitación nueva."
    if (error.status === 409) return error.message
  }
  return "No pudimos validar tu invitación. Intentá de nuevo más tarde."
}

export default function InvitationAcceptPage() {
  const [params] = useSearchParams()
  const token = params.get("token")
  // Fires on mount off the token alone — see useAcceptInvitation on why this is
  // a query and not a mutation.
  const accept = useAcceptInvitation(token)

  if (!token) {
    return (
      <AuthCard title="Enlace inválido" subtitle="Esta invitación no trae un token">
        <p className="text-sm text-secondary-foreground">
          Abrí el enlace tal como llegó al correo, o pedí una invitación nueva.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Ir al inicio de sesión
        </Link>
      </AuthCard>
    )
  }

  if (accept.isSuccess) {
    return <Navigate to={accept.data.profileCompleted ? "/" : "/onboarding/profile"} replace />
  }

  return (
    <AuthCard title="Invitación" subtitle="Te estamos sumando al espacio">
      {accept.isError ? (
        <>
          <p role="alert" className="text-sm text-destructive">
            {acceptErrorMessage(accept.error)}
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Ir al inicio de sesión
          </Link>
        </>
      ) : (
        <p className="text-sm text-secondary-foreground">Validando tu invitación…</p>
      )}
    </AuthCard>
  )
}
