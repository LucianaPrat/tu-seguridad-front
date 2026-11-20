import { useEffect } from "react"
import * as authApi from "@/api/auth"
import { useSessionStore } from "@/stores/sessionStore"

const THROTTLE_MS = 30_000
// Module level: every page mounts its own AppShell, so a ref would reset on navigation.
let lastRefresh = 0

/**
 * Refetches /auth/me when the tab regains focus, so a role or menu change made
 * by an admin reaches a logged-in user without a reload. Errors are ignored:
 * a failed refresh must not log anyone out, the next request deals with it.
 */
export function useRefreshOnFocus() {
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return
      const store = useSessionStore.getState()
      if (!store.isLoggedIn || Date.now() - lastRefresh < THROTTLE_MS) return
      lastRefresh = Date.now()
      authApi
        .me()
        .then(store.setSession)
        .catch(() => {})
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [])
}
