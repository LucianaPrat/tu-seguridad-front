import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { queryClient } from "@/lib/queryClient"
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

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useSessionStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireDVR({ children }: { children: ReactNode }) {
  const { isLoggedIn, isDVRInit } = useSessionStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isDVRInit) return <Navigate to="/onboarding/dvr" replace />
  return <>{children}</>
}

export function AppRoutes() {
  const { isLoggedIn, isDVRInit } = useSessionStore()

  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            isDVRInit ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/onboarding/dvr" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/recover" element={<PasswordRecoveryPage />} />
      <Route path="/auth/change-password" element={<PasswordChangePage />} />
      <Route path="/auth/magic-link" element={<MagicLinkPage />} />

      {/* Onboarding */}
      <Route
        path="/onboarding/dvr"
        element={
          <RequireAuth>{isDVRInit ? <Navigate to="/" replace /> : <DVRInitPage />}</RequireAuth>
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
