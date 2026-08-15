import { vi } from "vitest"

export interface MockResponse {
  status?: number
  body?: unknown
}

/**
 * Stubs global fetch with a queue: one entry per expected call, in order.
 * Returns the mock so tests can assert on the URL, method and headers.
 */
export function mockFetchSequence(responses: MockResponse[]) {
  const fetchMock = vi.fn()

  for (const { status = 200, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  }

  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Network-level failure: fetch itself rejects, no response at all. */
export function mockFetchNetworkError() {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}
