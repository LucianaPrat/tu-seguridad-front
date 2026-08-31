import { beforeEach, describe, expect, it } from "vitest"
import * as eventsApi from "@/api/events"
import { API_BASE_URL } from "@/lib/http"
import { mockFetchSequence } from "@/test/mockFetch"
import { useSessionStore } from "@/stores/sessionStore"

beforeEach(() => {
  useSessionStore.setState({ accessToken: null })
})

describe("acknowledgeAlert", () => {
  it("posts the token and nothing else", async () => {
    const fetchMock = mockFetchSequence([{ status: 202, body: { accepted: true } }])

    await eventsApi.acknowledgeAlert("delivery-1.signature")

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/events/acknowledgements`)
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ token: "delivery-1.signature" }))
  })

  it("carries no bearer even when a session happens to exist", async () => {
    // The token is the credential. Sending a stale access token alongside it
    // would make the call fail for a reason that has nothing to do with the mail.
    useSessionStore.setState({ accessToken: "an-access-token" })
    const fetchMock = mockFetchSequence([{ status: 202, body: { accepted: true } }])

    await eventsApi.acknowledgeAlert("delivery-1.signature")

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it("rejects when the route refuses the body", async () => {
    mockFetchSequence([
      { status: 400, body: { statusCode: 400, code: "VALIDATION_ERROR", message: "nope" } },
    ])

    await expect(eventsApi.acknowledgeAlert("")).rejects.toThrow("nope")
  })
})
