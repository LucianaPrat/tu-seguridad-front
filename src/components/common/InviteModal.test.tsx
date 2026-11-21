import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InviteModal from "./InviteModal"
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

function setup() {
  const fetchMock = mockRoutes({
    "/cameras": { body: [CAMERA] },
    "/invitations": { status: 201, body: {} },
  })
  renderWithProviders(<InviteModal open onClose={vi.fn()} />)
  return fetchMock
}

async function submit(fetchMock: ReturnType<typeof setup>) {
  await userEvent.type(screen.getByLabelText("Email"), "nuevo@ejemplo.com")
  await userEvent.click(screen.getByRole("button", { name: /Enviar invitación/ }))
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/invitations"))).toBe(true),
  )
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/invitations"))!
  return JSON.parse(String((call[1] as RequestInit).body))
}

describe("InviteModal", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useLocaleStore.setState({ locale: "es" })
  })

  it("defaults to collaborator with the role's menu prefilled", async () => {
    const fetchMock = setup()

    expect(screen.getByLabelText("Eventos")).toBeChecked()
    expect(screen.getByLabelText("Miembros")).not.toBeChecked()

    expect(await submit(fetchMock)).toEqual({
      email: "nuevo@ejemplo.com",
      role: "collaborator",
      menuAccess: ["home", "monitor", "events", "dvr", "channels"],
      locale: "es",
    })
  })

  it("resets the menu for a guest and sends the chosen cameras", async () => {
    const fetchMock = setup()

    await userEvent.selectOptions(screen.getByLabelText("Rol"), "guest")
    expect(screen.getByLabelText("Inicio")).toBeChecked()
    expect(screen.getByLabelText("Monitoreo")).toBeChecked()
    expect(screen.getByLabelText("Eventos")).not.toBeChecked()
    await userEvent.click(await screen.findByLabelText("Entrada"))

    expect(await submit(fetchMock)).toMatchObject({
      role: "guest",
      menuAccess: ["home", "monitor"],
      cameraIds: [CAMERA_ID],
    })
  })

  it("locks the menu for an admin and sends neither menu nor cameras", async () => {
    const fetchMock = setup()

    await userEvent.selectOptions(screen.getByLabelText("Rol"), "admin")
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled()

    const body = await submit(fetchMock)
    expect(body).toEqual({ email: "nuevo@ejemplo.com", role: "admin", locale: "es" })
  })

  it("sends the chosen email language", async () => {
    const fetchMock = setup()

    await userEvent.selectOptions(screen.getByLabelText("Idioma del correo"), "en")

    expect(await submit(fetchMock)).toMatchObject({ locale: "en" })
  })

  it("starts on the current UI language", () => {
    useLocaleStore.setState({ locale: "en" })
    setup()

    expect(screen.getByLabelText("Email language")).toHaveValue("en")
  })
})
