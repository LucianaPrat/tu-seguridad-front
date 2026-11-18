import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { relativeTime } from "./time"

const NOW = new Date("2026-08-21T12:00:00.000Z")

/** `n` milliseconds before the frozen clock, as the API would stamp it. */
function ago(ms: number) {
  return new Date(NOW.getTime() - ms).toISOString()
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it("answers null for a camera that never stored a frame", () => {
    expect(relativeTime(null)).toBeNull()
  })

  it("says ahora below a minute, and on a frame stamped in the future", () => {
    expect(relativeTime(ago(59_000))).toBe("ahora")
    expect(relativeTime(ago(-5 * MINUTE))).toBe("ahora")
  })

  it("switches unit exactly on the bucket boundaries", () => {
    expect(relativeTime(ago(MINUTE))).toBe("1 min")
    expect(relativeTime(ago(59 * MINUTE))).toBe("59 min")
    expect(relativeTime(ago(HOUR))).toBe("1 h")
    expect(relativeTime(ago(23 * HOUR))).toBe("23 h")
    expect(relativeTime(ago(DAY))).toBe("1 d")
    expect(relativeTime(ago(3 * DAY))).toBe("3 d")
  })

  it("answers null for a timestamp it cannot read", () => {
    expect(relativeTime("not a date")).toBeNull()
  })
})
