import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { queryClient } from "@/lib/queryClient"
import { useSessionBootstrap } from "@/hooks/useAuth"
import { useDvr } from "@/hooks/useDvr"
import { useSessionStore } from "@/stores/sessionStore"

// Auth pages
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import PasswordRecoveryPage from "@/pages/auth/PasswordRecoveryPage"
import PasswordChangePage from "@/pages/auth/PasswordChangePage"
import MagicLinkPage from "@/pages/auth/MagicLinkPage"

// Onboarding
import DVRInitPage from "@/pages/onboarding/DVRInitPage"

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
 * ponytail: a reload prompt, not a retry button — the query already retries
 * once, and a stuck backend is not something this screen can resolve.
 */
function DVRUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
      No pudimos leer la configuración de tu DVR. Recargá la página para intentar de nuevo.
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
  const { isLoggedIn } = useSessionStore()
  const { data: dvr, isPending, isError } = useDvr()

  if (!isLoggedIn) return <Navigate to="/login" replace />
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

      {/* Onboarding */}
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
