import { describe, expect, it } from "vitest"
import {
  assignColors,
  formatMinutes,
  heatStep,
  OTHER_KEY,
  percentDelta,
  pivotByDay,
  relativeBucket,
  SERIES_COLORS,
} from "./memberActivity"

const DAYS = ["2026-11-01", "2026-11-02", "2026-11-03"]

describe("pivotByDay", () => {
  it("fills zeros for days without data", () => {
    const { keys, rows } = pivotByDay(
      DAYS,
      [{ date: "2026-11-02", userId: 1, sessions: 3 }],
      (r) => String(r.userId),
      (r) => r.sessions,
      7,
    )
    expect(keys).toEqual(["1"])
    expect(rows.map((r) => r["1"])).toEqual([0, 3, 0])
  })

  it("keeps top 6 and folds the rest into Otros past 7 series", () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      date: "2026-11-01",
      userId: i + 1,
      sessions: i + 1,
    }))
    const { keys, rows } = pivotByDay(
      DAYS,
      data,
      (r) => String(r.userId),
      (r) => r.sessions,
      7,
    )
    expect(keys).toEqual(["8", "7", "6", "5", "4", "3", OTHER_KEY])
    expect(rows[0][OTHER_KEY]).toBe(3)
  })

  it("keeps exactly 7 series unfolded", () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      date: "2026-11-01",
      userId: i,
      sessions: 1,
    }))
    const { keys } = pivotByDay(
      DAYS,
      data,
      (r) => String(r.userId),
      (r) => r.sessions,
      7,
    )
    expect(keys).not.toContain(OTHER_KEY)
  })
})

describe("assignColors", () => {
  it("keys the hue by id, not by rank", () => {
    expect(assignColors(["9", "2"])["2"]).toBe(SERIES_COLORS[0])
    expect(assignColors(["2", "9"])["9"]).toBe(SERIES_COLORS[1])
  })
})

describe("percentDelta", () => {
  it("computes percent change", () => {
    expect(percentDelta(150, 100)).toBe(50)
    expect(percentDelta(50, 100)).toBe(-50)
  })
  it("is null without a previous period", () => {
    expect(percentDelta(5, 0)).toBeNull()
  })
})

describe("relativeBucket", () => {
  const now = new Date("2026-11-25T12:00:00Z")
  it("picks the largest whole unit", () => {
    expect(relativeBucket("2026-11-25T09:00:00Z", now)).toEqual({ value: -3, unit: "hour" })
    expect(relativeBucket("2026-11-22T12:00:00Z", now)).toEqual({ value: -3, unit: "day" })
    expect(relativeBucket("2026-11-04T12:00:00Z", now)).toEqual({ value: -3, unit: "week" })
    expect(relativeBucket("2026-08-25T12:00:00Z", now).unit).toBe("month")
    expect(relativeBucket("2026-11-25T11:59:40Z", now)).toEqual({ value: 0, unit: "minute" })
  })
})

describe("misc", () => {
  it("formats minutes", () => {
    expect(formatMinutes(125)).toBe("2h 5m")
  })
  it("maps heat steps", () => {
    expect(heatStep(0, 10)).toBe(-1)
    expect(heatStep(10, 10)).toBe(6)
    expect(heatStep(1, 10)).toBe(0)
  })
})
