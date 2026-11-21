import { Bell, ChevronDown, Construction, Menu } from "lucide-react"
import { useT } from "@/hooks/useT"
import { useSessionStore } from "@/stores/sessionStore"
import { useLogout } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { startTour } from "@/hooks/useOnboardingTour"
import { useCan } from "@/lib/permissions"
import { useNavStore } from "@/stores/navStore"

export default function TopBar() {
  const { t } = useT()
  const { showNotImplemented } = useCan()
  const {
    setOpen,
    userMenuOpen: menuOpen,
    setUserMenuOpen: setMenuOpen,
    tourActive,
  } = useNavStore()
  const { user } = useSessionStore()
  const { mutate: logout } = useLogout()
  const navigate = useNavigate()

  function handleLogout() {
    // Clears the session locally either way — see useLogout's onSettled.
    logout()
    navigate("/login")
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-4 lg:px-6 gap-2 sm:gap-4 shrink-0">
      {/* Menu — the only way to the sidebar below `lg`. `mr-auto` claims the
          empty left side without touching the header's justify-end. */}
      <button
        data-tour="nav-toggle"
        onClick={() => setOpen(true)}
        aria-label={t("nav.openMenu")}
        className="lg:hidden mr-auto -ml-1 p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
      >
        <Menu size={22} />
      </button>

      {/* Bell — no notifications feed yet. The unread dot was fake; the badge says why it is off. */}
      {showNotImplemented && (
        <button
          disabled
          title={t("common.notImplemented")}
          className="relative min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 disabled:cursor-not-allowed"
        >
          <Bell size={18} />
          <Construction size={10} className="absolute top-2 right-2" />
        </button>
      )}

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 min-h-11 px-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.firstName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1a6b61] flex items-center justify-center text-white text-xs font-semibold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
          )}
          <span className="hidden sm:inline text-sm font-medium text-gray-800">
            {user?.firstName}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {menuOpen && (
          <>
            {!tourActive && (
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            )}
            <div
              data-tour="topbar-menu"
              className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-48 max-w-[calc(100vw-2rem)]"
            >
              <button
                onClick={() => {
                  navigate("/profile")
                  setMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t("nav.myProfile")}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  startTour(navigate)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t("nav.viewTutorial")}
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                {t("nav.logout")}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
