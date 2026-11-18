import { beforeEach, describe, expect, it } from "vitest"
import * as authApi from "@/api/auth"
import { API_BASE_URL } from "@/lib/http"
import { meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { useSessionStore } from "@/stores/sessionStore"

beforeEach(() => {
  useSessionStore.setState({ accessToken: null })
})

describe("login", () => {
  it("posts the credentials and returns the access token", async () => {
    const fetchMock = mockFetchSequence([{ body: { accessToken: "atoken" } }])

    const token = await authApi.login({ email: "a@a.com", password: "secret" })

    expect(token).toBe("atoken")
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/auth/login`)
    expect(init.method).toBe("POST")
  })

  it("throws when the response is missing the access token", async () => {
    mockFetchSequence([{ body: { refreshToken: "leaked" } }])

    await expect(authApi.login({ email: "a@a.com", password: "secret" })).rejects.toThrow()
  })
})

describe("refresh", () => {
  it("sends no body — the cookie carries the token", async () => {
    const fetchMock = mockFetchSequence([{ body: { accessToken: "fresh" } }])

    const token = await authApi.refresh()

    expect(token).toBe("fresh")
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBeUndefined()
    expect(init.credentials).toBe("include")
  })
})

describe("logout", () => {
  it("posts and resolves on a 204", async () => {
    const fetchMock = mockFetchSequence([{ status: 204 }])

    await expect(authApi.logout()).resolves.toBeUndefined()

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(`${API_BASE_URL}/auth/logout`)
  })
})

describe("me", () => {
  it("parses the profile", async () => {
    const profile = meResponse()
    mockFetchSequence([{ body: profile }])

    await expect(authApi.me()).resolves.toEqual(profile)
  })

  it("throws when the profile shape drifts", async () => {
    mockFetchSequence([{ body: { ...meResponse(), id: "1" } }])

    await expect(authApi.me()).rejects.toThrow()
  })

  it("throws on a role the app does not know", async () => {
    mockFetchSequence([{ body: { ...meResponse(), role: "owner" } }])

    await expect(authApi.me()).rejects.toThrow()
  })
})

describe("completeProfile", () => {
  it("posts the profile and returns the re-issued token", async () => {
    const fetchMock = mockFetchSequence([{ body: { accessToken: "reissued" } }])

    const token = await authApi.completeProfile({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+5491112345678",
      password: "unaClaveLarga1",
    })

    expect(token).toBe("reissued")
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/auth/complete-profile`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+5491112345678",
      password: "unaClaveLarga1",
    })
  })
})
