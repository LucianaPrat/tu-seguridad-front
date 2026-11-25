import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import StatsPage from "./StatsPage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

afterEach(() => vi.unstubAllGlobals())

describe("StatsPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("renders the header and the activity charts for an admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.includes("/members/activity")
                ? {
                    timezone: "America/Montevideo",
                    days: ["2026-11-01"],
                    accessesByDay: [],
                    watchByDay: [],
                    watchByUserCamera: [],
                    lastAccess: [],
                    previous: { sessions: 0, activeUsers: 0, watchMinutes: 0 },
                  }
                : { items: [], total: 0 },
            ),
            { headers: { "Content-Type": "application/json" } },
          ),
        ),
      ),
    )
    renderWithProviders(<StatsPage />)

    expect(screen.getByRole("heading", { name: "Estadísticas" })).toBeInTheDocument()
    expect(await screen.findByText("Última semana")).toBeInTheDocument()
  })
})
