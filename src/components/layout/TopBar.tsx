import { Bell, ChevronDown, Menu } from "lucide-react"
import { useSessionStore } from "@/stores/sessionStore"
import { useLogout } from "@/hooks/useAuth"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { startTour } from "@/hooks/useOnboardingTour"
import { useNavStore } from "@/stores/navStore"

export default function TopBar() {
  const { setOpen } = useNavStore()
  const { user } = useSessionStore()
  const { mutate: logout } = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
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
        aria-label="Abrir menú"
        className="lg:hidden mr-auto -ml-1 p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
      >
        <Menu size={22} />
      </button>

      {/* Bell */}
      <button className="relative min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
        <Bell size={18} />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#1a6b61] border border-white" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          data-tour="topbar-user"
          onClick={() => setMenuOpen((o) => !o)}
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
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-48 max-w-[calc(100vw-2rem)]">
              <button
                onClick={() => {
                  navigate("/profile")
                  setMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Mi perfil
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  startTour(navigate)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Ver el tutorial
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
