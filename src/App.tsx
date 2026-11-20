import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { queryClient } from "@/lib/queryClient"
import { useLogout, useSessionBootstrap } from "@/hooks/useAuth"
import { useSwitchSpace } from "@/hooks/useSpaces"
import { useCan, MENU_KEYS, MENU_ROUTES, type MenuKey } from "@/lib/permissions"
import { useSessionStore } from "@/stores/sessionStore"
import Button from "@/components/common/Button"
import { useT } from "@/hooks/useT"

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
import SpaceStartPage from "@/pages/onboarding/SpaceStartPage"
import CompleteProfilePage from "@/pages/onboarding/CompleteProfilePage"

// App pages
import DashboardPage from "@/pages/app/DashboardPage"
import DVRConfigPage from "@/pages/app/DVRConfigPage"
import CameraMonitorPage from "@/pages/app/CameraMonitorPage"
import EventsPage from "@/pages/app/EventsPage"
import EventDetailPage from "@/pages/app/EventDetailPage"
import MembersPage from "@/pages/app/MembersPage"
import CommChannelsPage from "@/pages/app/CommChannelsPage"
import ProfilePage from "@/pages/app/ProfilePage"
import HelpChatPage from "@/pages/app/HelpChatPage"

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
 * Order matters: session → profile → space → recorder. The recorder answer is
 * currentSpace.hasDvr from /auth/me — GET /dvr needs the dvr section, so it
 * cannot be the probe for a member without it.
 */
function DVRGate({
  need,
  children,
}: {
  need: "configured" | "missing" | "noSpace"
  children: ReactNode
}) {
  const { isLoggedIn, user } = useSessionStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  // Invited account with no name/phone/password: every route but /auth/me answers 403.
  if (user && !user.profileCompleted) return <Navigate to="/onboarding/profile" replace />
  const space = user?.currentSpace ?? null
  if (!space) return need === "noSpace" ? <>{children}</> : <Navigate to="/spaces/start" replace />
  if (need === "noSpace") return <Navigate to="/" replace />
  if (space.hasDvr) return need === "configured" ? <>{children}</> : <Navigate to="/" replace />
  // Only an admin can finish setup (the wizard also renames the space, admin-only).
  if (space.role !== "admin") return <SpaceNotConfigured />
  return need === "missing" ? <>{children}</> : <Navigate to="/onboarding/dvr" replace />
}

function SpaceNotConfigured() {
  const { t } = useT()
  const { user } = useSessionStore()
  const { mutate: logout } = useLogout()
  const switchSpace = useSwitchSpace()
  const others = (user?.spaces ?? []).filter((s) => s.id !== user?.currentSpace?.id)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">{t("spaces.notConfigured.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("spaces.notConfigured.body", { name: user?.currentSpace?.name ?? "" })}
      </p>
      {others.map((space) => (
        <Button
          key={space.id}
          variant="secondary"
          loading={switchSpace.isPending}
          onClick={() => switchSpace.mutate(space.id)}
        >
          {t("spaces.switchTo", { name: space.name })}
        </Button>
      ))}
      <Button variant="ghost" onClick={() => logout()}>
        {t("nav.logout")}
      </Button>
    </div>
  )
}

/** Section gate per route. Falls back to the first section the member has, else Profile (always visible). */
function RequireMenu({ menu, children }: { menu: MenuKey; children: ReactNode }) {
  const { canView } = useCan()
  if (canView(menu)) return <>{children}</>
  const first = MENU_KEYS.find(canView)
  return <Navigate to={first ? MENU_ROUTES[first] : "/profile"} replace />
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

      <Route
        path="/spaces/start"
        element={
          <DVRGate need="noSpace">
            <SpaceStartPage />
          </DVRGate>
        }
      />

      {/* App routes */}
      <Route
        path="/"
        element={
          <RequireDVR>
            <RequireMenu menu="home">
              <DashboardPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      <Route
        path="/dvr-config"
        element={
          <RequireDVR>
            <RequireMenu menu="dvr">
              <DVRConfigPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      <Route
        path="/cameras/monitor"
        element={
          <RequireDVR>
            <RequireMenu menu="monitor">
              <CameraMonitorPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      <Route
        path="/events"
        element={
          <RequireDVR>
            <RequireMenu menu="events">
              <EventsPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      {/* Where a row of the history table and an alert email's "View the alert"
          button both land. */}
      <Route
        path="/events/:id"
        element={
          <RequireDVR>
            <RequireMenu menu="events">
              <EventDetailPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      <Route
        path="/members"
        element={
          <RequireDVR>
            <RequireMenu menu="members">
              <MembersPage />
            </RequireMenu>
          </RequireDVR>
        }
      />
      <Route
        path="/channels"
        element={
          <RequireDVR>
            <RequireMenu menu="channels">
              <CommChannelsPage />
            </RequireMenu>
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
      <Route
        path="/help"
        element={
          <RequireDVR>
            <HelpChatPage />
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
