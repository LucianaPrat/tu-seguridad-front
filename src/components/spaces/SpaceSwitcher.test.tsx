import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SpaceSwitcher from "./SpaceSwitcher"
import { currentSpace, meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

const SPACES = [
  { id: "space-1", name: "Mi Espacio Seguro", role: "admin" as const },
  { id: "space-2", name: "Depósito", role: "guest" as const },
]

function signIn(overrides: Parameters<typeof meResponse>[0] = {}) {
  useSessionStore.setState({
    isLoggedIn: true,
    accessToken: "t1",
    user: meResponse({ spaces: SPACES, ...overrides }),
  })
}

const openMenu = () => userEvent.setup().click(screen.getByRole("button", { expanded: false }))

describe("SpaceSwitcher", () => {
  beforeEach(() => signIn())

  it("lists every space with the caller's role in it", async () => {
    renderWithProviders(<SpaceSwitcher />)
    await openMenu()

    expect(screen.getByRole("button", { name: /Depósito/ })).toHaveTextContent("Invitado")
    const current = screen.getByRole("button", { name: /Mi Espacio Seguro/, current: true })
    expect(current).toHaveTextContent("Administrador")
  })

  it("switches space, takes the new token and wipes the cache", async () => {
    const fetchMock = mockFetchSequence([
      { body: { accessToken: "t2" } },
      {
        body: meResponse({
          spaces: SPACES,
          currentSpace: currentSpace({
            id: "space-2",
            name: "Depósito",
            role: "guest",
            menuAccess: ["home", "monitor"],
          }),
        }),
      },
    ])
    const { queryClient } = renderWithProviders(<SpaceSwitcher />)
    queryClient.setQueryData(["cameras"], [1])
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { expanded: false }))

    await user.click(screen.getByRole("button", { name: /Depósito/ }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith("/auth/switch-space")).toBe(true)
    expect(JSON.parse(init.body as string)).toEqual({ spaceId: "space-2" })
    await waitFor(() => {
      const state = useSessionStore.getState()
      expect(state.accessToken).toBe("t2")
      expect(state.user?.currentSpace?.id).toBe("space-2")
    })
    expect(queryClient.getQueryData(["cameras"])).toBeUndefined()
  })

  it("offers rename to an admin only", async () => {
    const { unmount } = renderWithProviders(<SpaceSwitcher />)
    await openMenu()
    expect(screen.getByRole("button", { name: /Renombrar espacio/ })).toBeInTheDocument()
    unmount()

    signIn({ currentSpace: currentSpace({ role: "guest" }) })
    renderWithProviders(<SpaceSwitcher />)
    await openMenu()
    expect(screen.queryByRole("button", { name: /Renombrar espacio/ })).not.toBeInTheDocument()
  })

  it("links to the invitations only when some are pending", async () => {
    signIn({ pendingInvitationsCount: 2 })
    const { unmount } = renderWithProviders(<SpaceSwitcher />)
    await openMenu()
    expect(screen.getByRole("link", { name: "Invitaciones (2)" })).toHaveAttribute(
      "href",
      "/invitations",
    )
    unmount()

    signIn({ pendingInvitationsCount: 0 })
    renderWithProviders(<SpaceSwitcher />)
    await openMenu()
    expect(screen.queryByRole("link", { name: /Invitaciones/ })).not.toBeInTheDocument()
  })
})
