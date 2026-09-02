import { useState, type ReactNode } from "react"
import Sidebar from "./Sidebar"
import MobileNav from "./MobileNav"
import TopBar from "./TopBar"
import { useOnboardingTour } from "@/hooks/useOnboardingTour"

export default function AppShell({ children }: { children: ReactNode }) {
  // Every app page renders its own AppShell, so this is the one hook that runs
  // on all of them — and the tour survives the remount navigation causes.
  useOnboardingTour()
  const [navOpen, setNavOpen] = useState(false)

  return (
    // `h-dvh`, not `h-screen`: on mobile Safari `100vh` counts the URL bar, so
    // the overflow-hidden below would clip the last rows of every page.
    <div className="flex h-dvh overflow-hidden bg-[#f4f7f6]">
      <Sidebar />
      <MobileNav open={navOpen} onOpenChange={setNavOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
