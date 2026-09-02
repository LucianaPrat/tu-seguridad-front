import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Shield,
  Calendar,
  PlayCircle,
  User,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  MessageCircle,
} from "lucide-react"
import { useSessionStore } from "@/stores/sessionStore"
import { useLogout } from "@/hooks/useAuth"
import { startTour } from "@/hooks/useOnboardingTour"

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  children?: { label: string; to: string }[]
  tour?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", icon: <LayoutDashboard size={18} />, to: "/", tour: "nav-home" },
]

const SERVICE_ITEMS: NavItem[] = [
  { label: "Monitoreo", icon: <Shield size={18} />, to: "/cameras/monitor", tour: "nav-monitor" },
  { label: "Eventos", icon: <Calendar size={18} />, to: "/events", tour: "nav-events" },
  { label: "Grabaciones", icon: <PlayCircle size={18} />, to: "#" },
]

const ACCOUNT_ITEMS: NavItem[] = [
  { label: "Perfil", icon: <User size={18} />, to: "/profile", tour: "nav-profile" },
  { label: "Notificaciones", icon: <Bell size={18} />, to: "#" },
]

/** A row is a tap target before it is a link: 44px is the phone floor. */
const ROW = "flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium"
const ROW_IDLE = "text-white/75 hover:text-white hover:bg-white/10 transition-colors"

function rowClass(isActive: boolean) {
  return `${ROW} transition-colors ${isActive ? "bg-[#1d7068] text-white" : ROW_IDLE}`
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      data-tour={item.tour}
      onClick={onNavigate}
      className={({ isActive }) => rowClass(isActive && item.to !== "#")}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.children && <ChevronRight size={14} className="opacity-50" />}
    </NavLink>
  )
}

/**
 * The menu itself, without the frame around it. The permanent sidebar below and
 * the mobile drawer in MobileNav both render this, so there is one menu to keep
 * in order — and `onNavigate` is how the drawer closes on the way out.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSessionStore()
  const { mutate: logout } = useLogout()
  const navigate = useNavigate()

  function handleLogout() {
    // Clears the session locally either way — see useLogout's onSettled.
    logout()
    navigate("/login")
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {user?.spaceName ?? "Tu Seguridad"}
          </p>
          <p className="text-white/50 text-xs">Panel de control</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-white/40 text-xs font-semibold uppercase tracking-wider">
            Servicios
          </p>
        </div>
        {SERVICE_ITEMS.map((item) => (
          <NavItemLink key={item.label} item={item} onNavigate={onNavigate} />
        ))}

        {/* DVR Config under services */}
        <NavLink
          to="/dvr-config"
          data-tour="nav-dvr"
          onClick={onNavigate}
          className={({ isActive }) => rowClass(isActive)}
        >
          <span className="shrink-0">
            <Shield size={18} />
          </span>
          DVR
        </NavLink>

        {/* Canales */}
        <NavLink
          to="/channels"
          data-tour="nav-channels"
          onClick={onNavigate}
          className={({ isActive }) => rowClass(isActive)}
        >
          <span className="shrink-0">
            <MessageCircle size={18} />
          </span>
          Canales
        </NavLink>

        {/* Miembros */}
        <NavLink
          to="/members"
          data-tour="nav-members"
          onClick={onNavigate}
          className={({ isActive }) => rowClass(isActive)}
        >
          <span className="shrink-0">
            <User size={18} />
          </span>
          Miembros
        </NavLink>

        <div className="pt-4 pb-1">
          <p className="px-3 text-white/40 text-xs font-semibold uppercase tracking-wider">
            Cuenta
          </p>
        </div>
        {ACCOUNT_ITEMS.map((item) => (
          <NavItemLink key={item.label} item={item} onNavigate={onNavigate} />
        ))}

        <button
          data-tour="nav-help"
          onClick={() => {
            onNavigate?.()
            startTour(navigate)
          }}
          className={`w-full ${ROW} ${ROW_IDLE}`}
        >
          <HelpCircle size={18} className="shrink-0" />
          Ayuda
        </button>

        <button onClick={handleLogout} className={`w-full ${ROW} ${ROW_IDLE}`}>
          <LogOut size={18} className="shrink-0" />
          Cerrar sesión
        </button>
      </nav>

      {/* Support card */}
      <div className="m-3 mt-4 p-3 rounded-xl bg-white/10 border border-white/10">
        <p className="text-white text-xs font-semibold">¿Necesitás ayuda?</p>
        <p className="text-white/60 text-xs mt-0.5">Contactanos por WhatsApp o teléfono.</p>
        <button className="mt-2 w-full py-2 rounded-lg bg-white text-[#0d4f47] text-xs font-semibold hover:bg-white/90 transition-colors">
          Soporte
        </button>
      </div>
    </>
  )
}

/**
 * The permanent menu, from `lg` up. Below that the sidebar would eat two thirds
 * of a phone with no way to dismiss it, so it hides and MobileNav takes over.
 */
export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[#0d4f47] overflow-y-auto">
      <SidebarContent />
    </aside>
  )
}
