import { create } from "zustand"

interface NavState {
  /**
   * The mobile drawer. Here and not in AppShell because every app page mounts
   * its own AppShell: a route change unmounts it, and a `useState` would snap
   * back to closed on exactly the navigations the tour walks through.
   */
  open: boolean
  /**
   * True while the guided tour runs. The drawer drops out of modal mode for
   * that stretch — Radix's modal branch traps focus and marks everything
   * outside the panel `aria-hidden`, and driver.js's popover is outside it.
   */
  tourActive: boolean
  setOpen: (open: boolean) => void
  setTourActive: (active: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  open: false,
  tourActive: false,
  setOpen: (open) => set({ open }),
  setTourActive: (tourActive) => set({ tourActive }),
}))
