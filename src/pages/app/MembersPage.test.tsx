import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MembersPage from "./MembersPage"
import { currentSpace, meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Two queries leave the same render, so an ordered fetch queue would be a race.
 * This stub answers by URL instead, which is also what the "a member never asks
 * for the invitations" assertion reads.
 */
function mockRoutes(routes: Record<string, { status?: number; body?: unknown }>) {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
    const match = Object.keys(routes).find((path) => url.includes(path))
    if (!match) return Promise.reject(new Error(`unexpected fetch: ${url}`))
    const { status = 200, body } = routes[match]
    return Promise.resolve(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: "luciana@ejemplo.com",
    firstName: "Luciana",
    lastName: "García",
    phone: "+5491112345678",
    avatarUrl: null,
    isActive: true,
    profileCompleted: true,
    lastLoginAt: "2026-07-28T22:00:00.000Z",
    receiveAlerts: true,
    role: "admin",
    ...overrides,
  }
}

const INVITED = member({
  id: 2,
  role: "collaborator",
  menuAccess: ["home", "monitor", "events", "dvr", "channels"],
  email: "nueva@ejemplo.com",
  firstName: "",
  lastName: "",
  phone: "",
  profileCompleted: false,
  lastLoginAt: null,
})

const PENDING = {
  id: "inv-1",
  email: "pendiente@ejemplo.com",
  role: "collaborator",
  menuAccess: ["home", "monitor", "events", "dvr", "channels"],
  cameraIds: [],
  expiresAt: "2026-08-29T12:00:00.000Z",
  createdAt: "2026-08-22T12:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("MembersPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("renders the roster and the pending invitations for an admin", async () => {
    mockRoutes({
      "/members": { body: { items: [member(), INVITED], total: 2 } },
      "/invitations": { body: { items: [PENDING], total: 1 } },
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    expect(screen.getByText("2 usuarios registrados")).toBeInTheDocument()
    // An unfinished profile has no name and never logged in; the email column is
    // what identifies it.
    expect(screen.getByText("nueva@ejemplo.com")).toBeInTheDocument()
    expect(screen.getByText("Sin nombre")).toBeInTheDocument()
    expect(screen.getByText("Perfil incompleto")).toBeInTheDocument()
    expect(screen.getByText("Nunca")).toBeInTheDocument()
    expect(await screen.findByText("pendiente@ejemplo.com")).toBeInTheDocument()
    expect(screen.getByText("Pendiente")).toBeInTheDocument()
  })

  it("shows pending rows read-only to a collaborator with the members section", async () => {
    mockRoutes({
      "/members": { body: { items: [member({ role: "collaborator" })], total: 1 } },
      "/invitations": { body: { items: [PENDING], total: 1 } },
    })
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({
          role: "collaborator",
          menuAccess: ["home", "monitor", "members"],
        }),
      }),
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("pendiente@ejemplo.com")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Editar|Reenviar|Revocar/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: "Acceso" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Invitar miembro/ })).not.toBeInTheDocument()
  })

  it("never asks for the invitations without the members section", async () => {
    const fetchMock = mockRoutes({ "/members": { body: { items: [member()], total: 1 } } })
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({ role: "collaborator", menuAccess: ["home"] }),
      }),
    })

    renderWithProviders(<MembersPage />)

    await waitFor(() => expect(screen.getAllByText("Cargando miembros…").length).toBeGreaterThan(0))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("offers no invite button to a plain member", async () => {
    mockRoutes({
      "/members": { body: { items: [member()], total: 1 } },
      "/invitations": { body: { items: [], total: 0 } },
    })
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({ role: "collaborator", menuAccess: ["members"] }),
      }),
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    // POST /invitations is admin-only: a button that can only 403 is worse than none.
    expect(screen.queryByRole("button", { name: /Invitar miembro/ })).not.toBeInTheDocument()
  })

  const OTHER = member({
    id: 2,
    email: "otro@ejemplo.com",
    firstName: "Otro",
    lastName: "Miembro",
    role: "collaborator",
    menuAccess: ["home", "monitor", "events", "dvr", "channels"],
  })

  function bodyOf(fetchMock: ReturnType<typeof mockRoutes>, method: string, path: string) {
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith(path) && init?.method === method,
    )
    return call && (call[1]?.body ? JSON.parse(String(call[1].body)) : null)
  }

  it("shows role and access columns for an admin", async () => {
    const GUEST = member({
      id: 3,
      email: "invitado@ejemplo.com",
      firstName: "Inv",
      lastName: "Itado",
      role: "guest",
      menuAccess: ["home", "monitor"],
      cameraIds: ["a", "b", "c"],
    })
    mockRoutes({
      "/members": {
        body: { items: [member({ menuAccess: [], cameraIds: [] }), OTHER, GUEST], total: 3 },
      },
      "/invitations": { body: { items: [], total: 0 } },
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByRole("columnheader", { name: "Rol" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Acceso" })).toBeInTheDocument()
    expect(screen.getByText("Colaborador")).toBeInTheDocument()
    expect(screen.getByText("5/6 secciones")).toBeInTheDocument()
    expect(screen.getByText("3 cámaras")).toBeInTheDocument()
    expect(screen.getByText("Todo")).toBeInTheDocument()
  })

  it("saves the edited access of a member", async () => {
    const fetchMock = mockRoutes({
      "/members/2": { body: OTHER },
      "/members": { body: { items: [member(), OTHER], total: 2 } },
      "/invitations": { body: { items: [], total: 0 } },
    })
    renderWithProviders(<MembersPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Editar otro@ejemplo.com" }))
    await userEvent.click(screen.getByLabelText("Eventos"))
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(bodyOf(fetchMock, "PATCH", "/members/2")).toBeTruthy())
    expect(bodyOf(fetchMock, "PATCH", "/members/2")).toEqual({
      role: "collaborator",
      menuAccess: ["home", "monitor", "dvr", "channels"],
      receiveAlerts: true,
    })
  })

  it("shows the backend message when the save is refused", async () => {
    mockRoutes({
      "/members/2": {
        status: 409,
        body: {
          statusCode: 409,
          code: "CONFLICT",
          message: "An admin cannot change their own role",
        },
      },
      "/members": { body: { items: [member(), OTHER], total: 2 } },
      "/invitations": { body: { items: [], total: 0 } },
    })
    renderWithProviders(<MembersPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Editar otro@ejemplo.com" }))
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An admin cannot change their own role",
    )
  })

  it("locks the role and offers no removal on your own row", async () => {
    mockRoutes({
      "/members": { body: { items: [member({ menuAccess: [], cameraIds: [] })], total: 1 } },
      "/invitations": { body: { items: [], total: 0 } },
    })
    renderWithProviders(<MembersPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Editar luciana@ejemplo.com" }))

    expect(screen.getByLabelText("Rol")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Quitar del espacio" })).not.toBeInTheDocument()
  })

  it("removes a member after confirming", async () => {
    const fetchMock = mockRoutes({
      "/members/2": { status: 204 },
      "/members": { body: { items: [member(), OTHER], total: 2 } },
      "/invitations": { body: { items: [], total: 0 } },
    })
    renderWithProviders(<MembersPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Editar otro@ejemplo.com" }))
    await userEvent.click(screen.getByRole("button", { name: "Quitar del espacio" }))
    await userEvent.click(await screen.findByRole("button", { name: "Quitar" }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => String(url).endsWith("/members/2") && init?.method === "DELETE",
        ),
      ).toBe(true),
    )
  })

  it("resends and revokes a pending invitation", async () => {
    const fetchMock = mockRoutes({
      "/invitations/inv-1/resend": { body: PENDING },
      "/invitations/inv-1": { status: 204 },
      "/members": { body: { items: [member({ menuAccess: [], cameraIds: [] })], total: 1 } },
      "/invitations": { body: { items: [PENDING], total: 1 } },
    })
    renderWithProviders(<MembersPage />)

    await userEvent.click(
      await screen.findByRole("button", { name: "Reenviar invitación a pendiente@ejemplo.com" }),
    )
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/invitations/inv-1/resend") && init?.method === "POST",
        ),
      ).toBe(true),
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Revocar invitación a pendiente@ejemplo.com" }),
    )
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => String(url).endsWith("/invitations/inv-1") && init?.method === "DELETE",
        ),
      ).toBe(true),
    )
  })

  it("shows the backend message when the roster fails", async () => {
    mockRoutes({
      "/members": {
        status: 500,
        body: { statusCode: 500, code: "INTERNAL_ERROR", message: "boom" },
      },
      "/invitations": { body: { items: [], total: 0 } },
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("boom")
  })
})
