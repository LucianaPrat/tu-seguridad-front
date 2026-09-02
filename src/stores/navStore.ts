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
  /**
   * The account dropdown in TopBar. Here for the same reason as `open`: TopBar
   * remounts with the AppShell on every navigation, and the tour has to hold
   * this menu open across the hop to /profile.
   */
  userMenuOpen: boolean
  setOpen: (open: boolean) => void
  setTourActive: (active: boolean) => void
  setUserMenuOpen: (open: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  open: false,
  tourActive: false,
  userMenuOpen: false,
  setOpen: (open) => set({ open }),
  setTourActive: (tourActive) => set({ tourActive }),
  setUserMenuOpen: (userMenuOpen) => set({ userMenuOpen }),
}))
