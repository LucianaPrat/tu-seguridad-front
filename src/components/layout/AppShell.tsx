import { type ReactNode } from "react"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import { useOnboardingTour } from "@/hooks/useOnboardingTour"

export default function AppShell({ children }: { children: ReactNode }) {
  // Every app page renders its own AppShell, so this is the one hook that runs
  // on all of them — and the tour survives the remount navigation causes.
  useOnboardingTour()

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7f6]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
