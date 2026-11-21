import { beforeEach, describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { SidebarContent } from "./Sidebar"
import { currentSpace, meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

describe("SidebarContent", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "t" })
  })

  it("lists only the sections a guest was granted, plus profile", () => {
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({ role: "guest", menuAccess: ["home", "monitor"] }),
      }),
    })

    renderWithProviders(<SidebarContent />)

    expect(screen.getAllByRole("link").map((l) => l.textContent?.trim())).toEqual([
      "Inicio",
      "Monitoreo",
      "Perfil",
    ])
  })

  it("drops a section heading with no visible items under it", () => {
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({ role: "guest", menuAccess: ["home"] }),
      }),
    })

    renderWithProviders(<SidebarContent />)

    expect(screen.queryByText("Servicios")).toBeNull()
    expect(screen.getByText("Cuenta")).toBeInTheDocument()
  })

  it("shows DVR, channels and members to an admin", () => {
    useSessionStore.setState({ user: meResponse() })

    renderWithProviders(<SidebarContent />)

    const labels = screen.getAllByRole("link").map((l) => l.textContent?.trim())
    expect(labels).toEqual(expect.arrayContaining(["DVR", "Canales", "Miembros"]))
  })

  it("hides not-implemented items from a guest", () => {
    useSessionStore.setState({
      user: meResponse({ currentSpace: currentSpace({ role: "guest" }) }),
    })
    renderWithProviders(<SidebarContent />)
    expect(screen.queryByText("Grabaciones")).toBeNull()
    expect(screen.queryByText("Notificaciones")).toBeNull()
  })

  it("shows not-implemented items to an admin", () => {
    useSessionStore.setState({ user: meResponse() })
    renderWithProviders(<SidebarContent />)
    expect(screen.getByText("Grabaciones")).toBeInTheDocument()
    expect(screen.getByText("Notificaciones")).toBeInTheDocument()
  })
})
