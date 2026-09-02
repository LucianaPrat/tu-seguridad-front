import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { startTour, waitFor } from "./useOnboardingTour"
import { useNavStore } from "@/stores/navStore"

/*
 * waitFor is what lets the tour cross a route: it holds until the outgoing
 * page's anchor is detached, so the selector can only match its replacement.
 */
describe("waitFor", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("resolves once the check passes", async () => {
    const el = document.createElement("div")
    document.body.appendChild(el)

    const pending = waitFor(() => !el.isConnected)
    el.remove()

    expect(await pending).toBe(true)
  })

  it("gives up when the check never passes", async () => {
    expect(await waitFor(() => false, 30)).toBe(false)
  })
})

describe("startTour", () => {
  const tick = () => new Promise((r) => setTimeout(r, 60))
  const title = () => document.querySelector(".driver-popover-title")?.textContent
  const skipBtn = () => document.querySelector<HTMLElement>(".driver-popover-close-btn")

  function anchor(name: string, scope: "desktop" | "mobile" = "desktop") {
    let host = document.querySelector(`[data-nav="${scope}"]`)
    if (!host) {
      host = document.createElement("div")
      host.setAttribute("data-nav", scope)
      document.body.appendChild(host)
    }
    const el = document.createElement("div")
    el.setAttribute("data-tour", name)
    host.appendChild(el)
  }

  beforeEach(() => {
    // src/test/setup.ts seeds the "already seen" flag for every other suite.
    localStorage.removeItem("ts-tour-done")
    useNavStore.setState({ open: false, tourActive: false, userMenuOpen: false })
  })

  afterEach(() => {
    skipBtn()?.click()
    window.innerWidth = 1024
    document.body.innerHTML = ""
  })

  it("opens on the intro step with the overlay armed", async () => {
    startTour(vi.fn())
    await tick()

    expect(document.querySelector(".driver-overlay")).not.toBeNull()
    expect(title()).toContain("Bienvenido")
    // Total varies with role — an admin gets one step a plain member does not.
    expect(document.querySelector(".driver-popover-progress-text")?.textContent).toMatch(
      /^1 de \d+$/,
    )
  })

  it("labels the exit as Saltar and puts it in the footer", async () => {
    startTour(vi.fn())
    await tick()

    const skip = skipBtn()
    expect(skip?.textContent).toBe("Saltar")
    expect(skip?.closest(".driver-popover-footer")).not.toBeNull()
  })

  it("offers no Previous on the first step", async () => {
    startTour(vi.fn())
    await tick()

    const prev = document.querySelector(".driver-popover-prev-btn")
    // driver.js keeps the node and disables it; the stylesheet hides that state.
    expect(prev?.classList.contains("driver-popover-btn-disabled")).toBe(true)
  })

  it("advances to the next step once its anchor exists", async () => {
    anchor("nav-home")
    startTour(vi.fn())
    await tick()

    document.querySelector<HTMLElement>(".driver-popover-next-btn")?.click()
    await tick()

    expect(title()).toContain("Inicio")
  })

  it("skipping marks the tour seen and tears the overlay down", async () => {
    startTour(vi.fn())
    await tick()

    skipBtn()?.click()
    await tick()

    expect(localStorage.getItem("ts-tour-done")).toBe("1")
    expect(document.querySelector(".driver-popover")).toBeNull()
  })

  it("keeps the menu steps on a phone, pointed at the drawer copy", async () => {
    window.innerWidth = 500
    anchor("nav-toggle")
    anchor("nav-home", "mobile")

    startTour(vi.fn())
    await tick()
    document.querySelector<HTMLElement>(".driver-popover-next-btn")?.click()
    await tick()

    expect(title()).toContain("El menú")
  })

  it("opens the drawer for a menu step", async () => {
    window.innerWidth = 500
    anchor("nav-toggle")
    anchor("nav-home", "mobile")

    startTour(vi.fn())
    await tick()
    document.querySelector<HTMLElement>(".driver-popover-next-btn")?.click()
    await tick()
    document.querySelector<HTMLElement>(".driver-popover-next-btn")?.click()
    await tick()

    expect(useNavStore.getState().open).toBe(true)
  })
})
