import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { queryClient } from "@/lib/queryClient"
import { useLogout, useSessionBootstrap } from "@/hooks/useAuth"
import { useDvr } from "@/hooks/useDvr"
import { useSessionStore } from "@/stores/sessionStore"
import Button from "@/components/common/Button"

// Auth pages
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import PasswordRecoveryPage from "@/pages/auth/PasswordRecoveryPage"
import PasswordChangePage from "@/pages/auth/PasswordChangePage"
import MagicLinkPage from "@/pages/auth/MagicLinkPage"
import InvitationAcceptPage from "@/pages/auth/InvitationAcceptPage"

// Public event actions
import AcknowledgeAlertPage from "@/pages/events/AcknowledgeAlertPage"

// Onboarding
import DVRInitPage from "@/pages/onboarding/DVRInitPage"
import CompleteProfilePage from "@/pages/onboarding/CompleteProfilePage"

// App pages
import DashboardPage from "@/pages/app/DashboardPage"
import DVRConfigPage from "@/pages/app/DVRConfigPage"
import CameraMonitorPage from "@/pages/app/CameraMonitorPage"
import EventsPage from "@/pages/app/EventsPage"
import MembersPage from "@/pages/app/MembersPage"
import CommChannelsPage from "@/pages/app/CommChannelsPage"
import ProfilePage from "@/pages/app/ProfilePage"

/*
 * Holds the routes back until the boot-time session restore settles. Without
 * it a reloaded, logged-in operator flashes the login screen before the
 * refresh call lands.
 */
function AuthGate({ children }: { children: ReactNode }) {
  useSessionBootstrap()
  const { authStatus } = useSessionStore()

  if (authStatus === "unknown") return null
  return <>{children}</>
}

/*
 * Logging out is the only exit this screen can offer. A reload prompt was
 * worse than nothing: the fixture login paths (register, Face-Auth) hold no
 * access token, so GET /dvr answers 401 and both land here, and a reload
 * replays the boot refresh, finds no cookie and drops back to /login anyway.
 * Clearing the session first is what keeps the guard from looping.
 */
function DVRUnavailable() {
  const { mutate: logout } = useLogout()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-muted-foreground">No pudimos leer la configuración de tu DVR.</p>
      <Button variant="secondary" onClick={() => logout()}>
        Volver a iniciar sesión
      </Button>
    </div>
  )
}

/*
 * The recorder stored server-side is what decides onboarding, not a flag in
 * the store: a flag dies with the tab, so every login walked back into the DVR
 * wizard.
 *
 * Three answers, three behaviours. Pending renders nothing, or a configured
 * space flashes the wizard on every load. A failed GET renders the notice: a
 * dead or refusing backend is not the same as "never configured", and sending
 * the operator into the wizard there offers to overwrite a recorder we merely
 * failed to read. Only a resolved answer forks.
 */
function DVRGate({ need, children }: { need: "configured" | "missing"; children: ReactNode }) {
  const { isLoggedIn, user } = useSessionStore()
  const { data: dvr, isPending, isError } = useDvr()

  if (!isLoggedIn) return <Navigate to="/login" replace />
  /*
   * An invited account has no name, no phone and no password of its own, and
   * the backend answers 403 on every route until it does — GET /dvr included.
   * This has to sit above the isPending check: useDvr stays disabled for such a
   * session, and a disabled query is pending forever.
   */
  if (user && !user.profileCompleted) return <Navigate to="/onboarding/profile" replace />
  if (isPending) return null
  if (isError) return <DVRUnavailable />
  if (dvr) return need === "configured" ? <>{children}</> : <Navigate to="/" replace />
  return need === "missing" ? <>{children}</> : <Navigate to="/onboarding/dvr" replace />
}

function RequireDVR({ children }: { children: ReactNode }) {
  return <DVRGate need="configured">{children}</DVRGate>
}

/** Mirror of RequireDVR: the wizard is only reachable while nothing is stored. */
function RequireNoDVR({ children }: { children: ReactNode }) {
  return <DVRGate need="missing">{children}</DVRGate>
}

export function AppRoutes() {
  const { isLoggedIn } = useSessionStore()

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/recover" element={<PasswordRecoveryPage />} />
      <Route path="/auth/change-password" element={<PasswordChangePage />} />
      <Route path="/auth/magic-link" element={<MagicLinkPage />} />
      {/* The token in the emailed link is the credential, so this one is public. */}
      <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
      {/* Same rule for the acknowledge button of an alert email: its token is the
          credential, and the recipient reading mail on a phone has no session. */}
      <Route path="/events/:id/acknowledge" element={<AcknowledgeAlertPage />} />

      {/* Onboarding */}
      {/* Guards itself: RequireDVR would bounce an incomplete profile back here. */}
      <Route path="/onboarding/profile" element={<CompleteProfilePage />} />
      <Route
        path="/onboarding/dvr"
        element={
          <RequireNoDVR>
            <DVRInitPage />
          </RequireNoDVR>
        }
      />

      {/* App routes */}
      <Route
        path="/"
        element={
          <RequireDVR>
            <DashboardPage />
          </RequireDVR>
        }
      />
      <Route
        path="/dvr-config"
        element={
          <RequireDVR>
            <DVRConfigPage />
          </RequireDVR>
        }
      />
      <Route
        path="/cameras/monitor"
        element={
          <RequireDVR>
            <CameraMonitorPage />
          </RequireDVR>
        }
      />
      <Route
        path="/events"
        element={
          <RequireDVR>
            <EventsPage />
          </RequireDVR>
        }
      />
      {/*
       * Where an alert email's "View the alert" button lands. There is no
       * per-event screen yet, so it renders the history list: the operator
       * arrives at the right screen instead of the catch-all bouncing them to
       * the dashboard with no explanation. Point this at a detail page the day
       * one exists — the mail already sends the id.
       */}
      <Route
        path="/events/:id"
        element={
          <RequireDVR>
            <EventsPage />
          </RequireDVR>
        }
      />
      <Route
        path="/members"
        element={
          <RequireDVR>
            <MembersPage />
          </RequireDVR>
        }
      />
      <Route
        path="/channels"
        element={
          <RequireDVR>
            <CommChannelsPage />
          </RequireDVR>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireDVR>
            <ProfilePage />
          </RequireDVR>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthGate>
    </QueryClientProvider>
  )
}
