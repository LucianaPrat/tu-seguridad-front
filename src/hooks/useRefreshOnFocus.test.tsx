import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { useRefreshOnFocus } from "./useRefreshOnFocus"
import * as authApi from "@/api/auth"
import { currentSpace, meResponse } from "@/test/fixtures"
import { useSessionStore } from "@/stores/sessionStore"

function Probe() {
  useRefreshOnFocus()
  return null
}

describe("useRefreshOnFocus", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(1_000_000_000_000)
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("refreshes the session on focus, at most once per 30 s, ignoring errors", async () => {
    const me = vi
      .spyOn(authApi, "me")
      .mockResolvedValue(meResponse({ currentSpace: currentSpace({ role: "guest" }) }))
    render(<Probe />)

    window.dispatchEvent(new Event("focus"))
    await waitFor(() => expect(useSessionStore.getState().user?.currentSpace?.role).toBe("guest"))

    window.dispatchEvent(new Event("focus"))
    expect(me).toHaveBeenCalledTimes(1)

    vi.setSystemTime(1_000_000_031_000)
    me.mockRejectedValue(new Error("offline"))
    window.dispatchEvent(new Event("focus"))
    await waitFor(() => expect(me).toHaveBeenCalledTimes(2))
    expect(useSessionStore.getState().isLoggedIn).toBe(true)
  })
})
