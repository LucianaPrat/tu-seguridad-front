import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MemberEditSheet from "./MemberEditSheet"
import { memberResponseSchema, type MemberResponse } from "@/lib/schemas"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

const RAW = {
  id: 2,
  email: "nora@ejemplo.com",
  firstName: "Nora",
  lastName: "Paz",
  phone: "+59899123456",
  avatarUrl: null,
  isActive: true,
  profileCompleted: true,
  lastLoginAt: null,
  receiveAlerts: true,
  role: "collaborator",
  menuAccess: ["home"],
}

function member(overrides: Record<string, unknown> = {}): MemberResponse {
  return memberResponseSchema.parse({ ...RAW, ...overrides })
}

function stubFetch() {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(RAW), { headers: { "Content-Type": "application/json" } }),
    ),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe("MemberEditSheet", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("defaults profileEditable to false for an older backend", () => {
    expect(member().profileEditable).toBe(false)
  })

  it("disables the personal fields and explains why when not editable", () => {
    renderWithProviders(<MemberEditSheet member={member()} onClose={() => {}} />)

    expect(screen.getByLabelText("Nombre")).toBeDisabled()
    expect(screen.getByLabelText("Email")).toBeDisabled()
    expect(screen.getByLabelText("Teléfono móvil")).toBeDisabled()
    expect(screen.getByText(/Pertenece a otros espacios/)).toBeInTheDocument()
  })

  it("sends only the changed profile fields with the access patch", async () => {
    const fetchMock = stubFetch()
    renderWithProviders(
      <MemberEditSheet member={member({ profileEditable: true })} onClose={() => {}} />,
    )

    const first = screen.getByLabelText("Nombre")
    expect(first).toBeEnabled()
    await userEvent.clear(first)
    await userEvent.type(first, "Norita")
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ firstName: "Norita", role: "collaborator" })
    expect(body).not.toHaveProperty("lastName")
    expect(body).not.toHaveProperty("email")
    expect(body).not.toHaveProperty("phone")
  })

  it("shows an inline error for an invalid email and does not send", async () => {
    const fetchMock = stubFetch()
    renderWithProviders(
      <MemberEditSheet member={member({ profileEditable: true })} onClose={() => {}} />,
    )

    const email = screen.getByLabelText("Email")
    await userEvent.clear(email)
    await userEvent.type(email, "nope")
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(
      await screen.findByText(/email/i, { selector: "p.text-destructive" }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
