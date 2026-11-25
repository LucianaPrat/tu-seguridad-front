import LogoMark from "@/components/common/LogoMark"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Shield,
  HardDrive,
  Calendar,
  PlayCircle,
  User,
  Users,
  Bell,
  BarChart3,
  LogOut,
  ChevronRight,
  MessageCircle,
  Construction,
} from "lucide-react"
import { useT } from "@/hooks/useT"
import type { TranslationKey } from "@/lib/i18n"
import { useCan, type MenuKey } from "@/lib/permissions"
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher"
import { useLogout } from "@/hooks/useAuth"

interface NavItem {
  label: TranslationKey
  icon: React.ReactNode
  to?: string
  /** No screen behind it yet: rendered greyed out, not clickable. */
  disabled?: true
  children?: { label: TranslationKey; to: string }[]
  tour?: string
  /** Section gate; absent = always visible (profile, help, placeholders). */
  menu?: MenuKey
  /** Admins only, and not a MenuKey (stats). */
  adminOnly?: true
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "nav.home",
    icon: <LayoutDashboard size={18} />,
    to: "/",
    tour: "nav-home",
    menu: "home",
  },
]

const SERVICE_ITEMS: NavItem[] = [
  {
    label: "nav.monitoring",
    icon: <Shield size={18} />,
    to: "/cameras/monitor",
    tour: "nav-monitor",
    menu: "monitor",
  },
  {
    label: "nav.events",
    icon: <Calendar size={18} />,
    to: "/events",
    tour: "nav-events",
    menu: "events",
  },
  { label: "nav.recordings", icon: <PlayCircle size={18} />, disabled: true },
  {
    label: "nav.dvr",
    icon: <HardDrive size={18} />,
    to: "/dvr-config",
    tour: "nav-dvr",
    menu: "dvr",
  },
  {
    label: "nav.channels",
    icon: <MessageCircle size={18} />,
    to: "/channels",
    tour: "nav-channels",
    menu: "channels",
  },
  {
    label: "nav.members",
    icon: <Users size={18} />,
    to: "/members",
    tour: "nav-members",
    menu: "members",
  },
  {
    label: "nav.stats",
    icon: <BarChart3 size={18} />,
    to: "/stats",
    tour: "nav-stats",
    adminOnly: true,
  },
]

const ACCOUNT_ITEMS: NavItem[] = [
  { label: "nav.profile", icon: <User size={18} />, to: "/profile", tour: "nav-profile" },
  { label: "nav.notifications", icon: <Bell size={18} />, disabled: true },
  // Help hidden for now; the /help route stays. Restore with onboarding step 15.
]

const SECTIONS: [TranslationKey, NavItem[]][] = [["nav.services", SERVICE_ITEMS]]

/** A row is a tap target before it is a link: 44px is the phone floor. */
const ROW = "flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium"
const ROW_IDLE = "text-white/75 hover:text-white hover:bg-white/10 transition-colors"

function rowClass(isActive: boolean) {
  return `${ROW} transition-colors ${isActive ? "bg-[#1d7068] text-white" : ROW_IDLE}`
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useT()
  if (item.disabled || !item.to) {
    return (
      <span
        aria-disabled="true"
        title={t("common.notImplemented")}
        className={`${ROW} text-white/40 cursor-not-allowed`}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="flex-1">{t(item.label)}</span>
        <Construction size={14} />
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      data-tour={item.tour}
      onClick={onNavigate}
      className={({ isActive }) => rowClass(isActive)}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1">{t(item.label)}</span>
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
  const { t } = useT()
  const { canView, isAdmin, showNotImplemented } = useCan()
  const visible = (items: NavItem[]) =>
    items.filter(
      (i) =>
        (!i.menu || canView(i.menu)) &&
        (!i.adminOnly || isAdmin) &&
        (!i.disabled || showNotImplemented),
    )
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
      <div className="flex items-start gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <LogoMark size={22} />
        </div>
        <SpaceSwitcher onNavigate={onNavigate} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {visible(NAV_ITEMS).map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}

        {SECTIONS.map(([heading, items]) => {
          const shown = visible(items)
          // A heading with nothing under it is noise: drop the whole section.
          if (shown.length === 0) return null
          return (
            <div key={heading}>
              <div className="pt-4 pb-1">
                <p className="px-3 text-white/40 text-xs font-semibold uppercase tracking-wider">
                  {t(heading)}
                </p>
              </div>
              {shown.map((item) => (
                <NavItemLink key={item.label} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Account: outside the flex-1 nav so it stays pinned above the support card. */}
      <div className="px-3">
        <div className="pt-4 pb-1">
          <p className="px-3 text-white/40 text-xs font-semibold uppercase tracking-wider">
            {t("nav.account")}
          </p>
        </div>
        {visible(ACCOUNT_ITEMS).map((item) => (
          <NavItemLink key={item.label} item={item} onNavigate={onNavigate} />
        ))}
        <button onClick={handleLogout} className={`w-full ${ROW} ${ROW_IDLE}`}>
          <LogOut size={18} className="shrink-0" />
          {t("nav.logout")}
        </button>
      </div>

      {/* Support card */}
      <div className="m-3 mt-4 p-3 rounded-xl bg-white/10 border border-white/10">
        <p className="text-white text-xs font-semibold">{t("nav.needHelp")}</p>
        <p className="text-white/60 text-xs mt-0.5">{t("nav.contactUs")}</p>
        {showNotImplemented && (
          <>
            {/* No support channel wired yet. */}
            <button
              disabled
              title={t("common.notImplemented")}
              className="mt-2 w-full py-2 rounded-lg bg-white text-[#0d4f47] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Construction size={12} />
              {t("nav.support")}
            </button>
          </>
        )}
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
    <aside
      data-nav="desktop"
      className="hidden lg:flex flex-col w-60 shrink-0 bg-[#0d4f47] overflow-y-auto"
    >
      <SidebarContent />
    </aside>
  )
}
