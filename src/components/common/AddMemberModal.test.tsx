import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AddMemberModal from "./AddMemberModal"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useLocaleStore } from "@/stores/localeStore"
import { useSessionStore } from "@/stores/sessionStore"

const CAMERA_ID = "11111111-1111-4111-8111-111111111111"
const CAMERA = {
  id: CAMERA_ID,
  externalId: "101",
  name: "Entrada",
  location: null,
  status: "online",
  isConfigured: true,
  isEnabled: true,
  monitorMode: "full",
  alertType: null,
  lastSnapshotAt: null,
  latestSnapshotUrl: null,
}

/** Answers by URL (first match wins) and keeps `init` so tests can read the body. */
function mockRoutes(routes: Record<string, { status?: number; body?: unknown }>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
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

const MEMBER = {
  id: 7,
  email: "nuevo@ejemplo.com",
  firstName: "Luciana",
  lastName: "García",
  phone: "+5491122334455",
  avatarUrl: null,
  isActive: true,
  profileCompleted: true,
  lastLoginAt: null,
  receiveAlerts: true,
  role: "collaborator",
}

function setup(route: { status?: number; body?: unknown } = { status: 201, body: MEMBER }) {
  const fetchMock = mockRoutes({ "/cameras": { body: [CAMERA] }, "/members": route })
  renderWithProviders(<AddMemberModal open onClose={vi.fn()} />)
  return fetchMock
}

async function fill() {
  await userEvent.type(screen.getByLabelText("Email"), "nuevo@ejemplo.com")
  await userEvent.type(screen.getByLabelText("Nombre"), "Luciana")
  await userEvent.type(screen.getByLabelText("Apellido"), "García")
  await userEvent.type(screen.getByLabelText("Teléfono móvil"), "+5491122334455")
  await userEvent.type(screen.getByLabelText("Contraseña"), "una-clave-larga-123")
  await userEvent.click(screen.getByRole("button", { name: "Agregar miembro" }))
}

describe("AddMemberModal", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useLocaleStore.setState({ locale: "es" })
  })

  it("submits the profile, role defaults and locale", async () => {
    const fetchMock = setup()
    await fill()

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/members"))).toBe(true),
    )
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/members"))!
    expect((call[1] as RequestInit).method).toBe("POST")
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({
      email: "nuevo@ejemplo.com",
      firstName: "Luciana",
      lastName: "García",
      phone: "+5491122334455",
      password: "una-clave-larga-123",
      role: "collaborator",
      menuAccess: ["home", "monitor", "events", "dvr", "channels"],
      locale: "es",
    })
    expect(await screen.findByText("Miembro agregado")).toBeInTheDocument()
  })

  it("shows the backend message on a 409", async () => {
    setup({ status: 409, body: { message: "Ya es miembro del espacio" } })
    await fill()

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya es miembro del espacio")
  })
})
