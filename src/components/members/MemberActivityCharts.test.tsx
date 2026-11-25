import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import MemberActivityCharts from "./MemberActivityCharts"
import MembersPage from "@/pages/app/MembersPage"
import { memberActivityResponseSchema } from "@/lib/schemas"
import { currentSpace, meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

const MEMBER = {
  id: 1,
  email: "l@ejemplo.com",
  firstName: "Luciana",
  lastName: "García",
  phone: "1",
  avatarUrl: null,
  isActive: true,
  profileCompleted: true,
  lastLoginAt: null,
  receiveAlerts: true,
  role: "admin",
}
const NEVER = { ...MEMBER, id: 2, email: "n@ejemplo.com", firstName: "Nora", lastName: "Paz" }
const ACTIVITY = {
  timezone: "America/Montevideo",
  days: ["2026-11-01", "2026-11-02"],
  accessesByDay: [{ date: "2026-11-02", userId: 1, sessions: 3 }],
  watchByDay: [{ date: "2026-11-02", cameraId: "c1", minutes: 125 }],
  watchByUserCamera: [{ userId: 1, cameraId: "c1", minutes: 125 }],
  lastAccess: [{ userId: 1, at: "2026-11-02T10:00:00Z" }],
  previous: { sessions: 0, activeUsers: 0, watchMinutes: 0 },
}

function mockRoutes() {
  const fetchMock = vi.fn((url: string) => {
    const body = url.includes("/members/activity")
      ? ACTIVITY
      : url.includes("/members")
        ? { items: [MEMBER, NEVER], total: 2 }
        : { items: [], total: 0 }
    return Promise.resolve(
      new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe("MemberActivityCharts", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("parses the activity contract", () => {
    expect(memberActivityResponseSchema.parse(ACTIVITY).days).toHaveLength(2)
    expect(() => memberActivityResponseSchema.parse({ timezone: "UTC" })).toThrow()
  })

  it("renders KPIs, section titles and the table with never-active members last", async () => {
    mockRoutes()
    renderWithProviders(<MemberActivityCharts />)

    expect(await screen.findByText("Accesos por día")).toBeInTheDocument()
    expect(screen.getByText("Streaming por día")).toBeInTheDocument()
    expect(screen.getByText("Streaming por usuario y cámara")).toBeInTheDocument()
    expect(screen.getByText("Actividad por miembro")).toBeInTheDocument()
    expect(screen.getAllByText("sin datos previos")).toHaveLength(3)
    expect(screen.getByText("Última semana")).toBeInTheDocument()
    expect(screen.getByText("Nunca")).toBeInTheDocument()
    const names = screen.getAllByText(/Luciana García|Nora Paz/).map((n) => n.textContent)
    expect(names.at(-1)).toBe("Nora Paz")
  })

  it("is absent from MembersPage for a non-admin and never asks for activity", async () => {
    const fetchMock = mockRoutes()
    useSessionStore.setState({
      user: meResponse({
        currentSpace: currentSpace({ role: "collaborator", menuAccess: ["members"] }),
      }),
    })
    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    expect(screen.queryByText("Actividad")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/members/activity"))).toBe(false)
  })
})
