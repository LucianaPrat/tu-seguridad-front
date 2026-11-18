import { describe, expect, it } from "vitest"
import { Route, Routes } from "react-router-dom"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AcknowledgeAlertPage from "./AcknowledgeAlertPage"
import { API_BASE_URL } from "@/lib/http"
import { mockFetchNetworkError, mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

const TOKEN = "delivery-1.signature"

/** The page reads both the path id and the query token, so it needs a real route. */
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:id/acknowledge" element={<AcknowledgeAlertPage />} />
    </Routes>,
    { route },
  )
}

describe("AcknowledgeAlertPage", () => {
  it("sends nothing until the button is pressed", async () => {
    const fetchMock = mockFetchSequence([{ status: 202, body: { accepted: true } }])

    renderAt(`/events/event-1/acknowledge?token=${TOKEN}`)

    // A link scanner that renders the page must not acknowledge on the reader's
    // behalf — the whole reason this is a button and not a GET.
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await screen.findByRole("button", { name: /marcar como atendida/i })).toBeVisible()
  })

  it("posts the token from the query string, unauthenticated", async () => {
    const fetchMock = mockFetchSequence([{ status: 202, body: { accepted: true } }])

    renderAt(`/events/event-1/acknowledge?token=${TOKEN}`)
    await userEvent.click(screen.getByRole("button", { name: /marcar como atendida/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/events/acknowledgements`)
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ token: TOKEN }))
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it("confirms without claiming the alert changed state, and offers the alert", async () => {
    mockFetchSequence([{ status: 202, body: { accepted: true } }])

    renderAt(`/events/event-1/acknowledge?token=${TOKEN}`)
    await userEvent.click(screen.getByRole("button", { name: /marcar como atendida/i }))

    expect(await screen.findByText(/registramos tu confirmación/i)).toBeVisible()
    expect(screen.getByRole("link", { name: /ver la alerta/i })).toHaveAttribute(
      "href",
      "/events/event-1",
    )
  })

  it("asks for the mail button again when the link carries no token", () => {
    const fetchMock = mockFetchSequence([])

    renderAt("/events/event-1/acknowledge")

    expect(screen.getByText(/enlace incompleto/i)).toBeVisible()
    expect(screen.queryByRole("button", { name: /marcar como atendida/i })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("keeps the button after a failure so the press can be repeated", async () => {
    mockFetchNetworkError()

    renderAt(`/events/event-1/acknowledge?token=${TOKEN}`)
    await userEvent.click(screen.getByRole("button", { name: /marcar como atendida/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos conectar/i)
    expect(screen.getByRole("button", { name: /marcar como atendida/i })).toBeEnabled()
  })
})
