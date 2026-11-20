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

  it("lists only the sections a guest was granted, plus profile and help", () => {
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
      "Ayuda",
    ])
  })

  it("shows DVR, channels and members to an admin", () => {
    useSessionStore.setState({ user: meResponse() })

    renderWithProviders(<SidebarContent />)

    const labels = screen.getAllByRole("link").map((l) => l.textContent?.trim())
    expect(labels).toEqual(expect.arrayContaining(["DVR", "Canales", "Miembros"]))
  })
})
