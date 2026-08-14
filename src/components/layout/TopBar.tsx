import { Bell, ChevronDown } from "lucide-react"
import { useSession } from "@/context/SessionContext"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function TopBar() {
  const { user, logout } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 gap-4 shrink-0">
      {/* Bell */}
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1a6b61] border border-white" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.firstName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1a6b61] flex items-center justify-center text-white text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <span className="text-sm font-medium text-gray-800">{user?.firstName}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
              <button
                onClick={() => { navigate("/profile"); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Mi perfil
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
