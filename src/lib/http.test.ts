import { beforeEach, describe, expect, it, vi } from "vitest"
import { API_BASE_URL, ApiError, request } from "@/lib/http"
import { mockFetchNetworkError, mockFetchSequence } from "@/test/mockFetch"
import { useSessionStore } from "@/stores/sessionStore"

function headersOf(fetchMock: ReturnType<typeof mockFetchSequence>) {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return init.headers as Record<string, string>
}

beforeEach(() => {
  useSessionStore.setState({ accessToken: null })
})

describe("request", () => {
  it("prefixes the API base URL and sends credentials", async () => {
    const fetchMock = mockFetchSequence([{ body: { ok: true } }])

    await request("/auth/me")

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/auth/me`)
    expect(init.credentials).toBe("include")
  })

  it("attaches the bearer token held in the store", async () => {
    useSessionStore.setState({ accessToken: "atoken" })
    const fetchMock = mockFetchSequence([{ body: {} }])

    await request("/auth/me")

    expect(headersOf(fetchMock).Authorization).toBe("Bearer atoken")
  })

  it("sends no Authorization header when there is no token", async () => {
    const fetchMock = mockFetchSequence([{ body: {} }])

    await request("/auth/me")

    expect(headersOf(fetchMock).Authorization).toBeUndefined()
  })

  it("skips the bearer token when auth is off, even with one in the store", async () => {
    useSessionStore.setState({ accessToken: "atoken" })
    const fetchMock = mockFetchSequence([{ body: {} }])

    await request("/auth/login", { method: "POST", body: { email: "a@a.com" }, auth: false })

    expect(headersOf(fetchMock).Authorization).toBeUndefined()
    expect(headersOf(fetchMock)["Content-Type"]).toBe("application/json")
  })

  it("serialises the body and keeps the method", async () => {
    const fetchMock = mockFetchSequence([{ body: {} }])

    await request("/auth/login", { method: "POST", body: { email: "a@a.com" }, auth: false })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ email: "a@a.com" }))
  })

  it("turns the error envelope into an ApiError", async () => {
    mockFetchSequence([
      {
        status: 401,
        body: { statusCode: 401, code: "UNAUTHORIZED", message: "Invalid email or password" },
      },
    ])

    await expect(request("/auth/login", { method: "POST", auth: false })).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid email or password",
    })
  })

  it("falls back to UNKNOWN_ERROR for framework errors with no code key", async () => {
    // 404s and throttler 429s bypass the envelope entirely.
    mockFetchSequence([
      { status: 404, body: { message: "Cannot GET /api/v1/nope", error: "Not Found" } },
    ])

    await expect(request("/nope")).rejects.toMatchObject({
      status: 404,
      code: "UNKNOWN_ERROR",
      message: "Cannot GET /api/v1/nope",
    })
  })

  it("reports a failed fetch as status 0", async () => {
    mockFetchNetworkError()

    const error = await request("/auth/me").catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" })
  })

  it("resolves to undefined on a 204", async () => {
    mockFetchSequence([{ status: 204 }])

    await expect(request("/auth/logout", { method: "POST", auth: false })).resolves.toBeUndefined()
  })
})

describe("401 refresh", () => {
  beforeEach(() => {
    useSessionStore.setState({ accessToken: "old", isLoggedIn: true })
  })

  it("refreshes once and retries with the new token", async () => {
    const fetchMock = mockFetchSequence([
      { status: 401, body: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
      { body: { accessToken: "new" } },
      { body: { ok: true } },
    ])

    await expect(request("/cameras")).resolves.toEqual({ ok: true })

    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/auth/refresh`)
    const [, retry] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect((retry.headers as Record<string, string>).Authorization).toBe("Bearer new")
    expect(useSessionStore.getState().accessToken).toBe("new")
  })

  it("shares one refresh between concurrent 401s", async () => {
    const unauthorized = () =>
      new Response(JSON.stringify({ code: "UNAUTHORIZED" }), { status: 401 })
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return new Response(JSON.stringify({ accessToken: "new" }))
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === "Bearer new" ? new Response(JSON.stringify({ ok: true })) : unauthorized()
    })
    vi.stubGlobal("fetch", fetchMock)

    await Promise.all([request("/a"), request("/b"), request("/c")])

    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))
    expect(refreshes).toHaveLength(1)
  })

  it("logs out when the refresh fails", async () => {
    mockFetchSequence([
      { status: 401, body: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
      { status: 401, body: { code: "UNAUTHORIZED" } },
    ])

    await expect(request("/cameras")).rejects.toMatchObject({ status: 401 })
    expect(useSessionStore.getState()).toMatchObject({ accessToken: null, isLoggedIn: false })
  })
})
