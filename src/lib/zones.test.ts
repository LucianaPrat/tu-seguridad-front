import { describe, expect, it } from "vitest"
import { bboxOf, rectPoints, toSvgPoints } from "@/lib/zones"

describe("zone geometry", () => {
  it("wraps a free-hand path in its bounding box", () => {
    expect(
      bboxOf([
        { x: 30, y: 10 },
        { x: 10, y: 40 },
        { x: 50, y: 25 },
      ]),
    ).toEqual({
      x: 10,
      y: 10,
      width: 40,
      height: 30,
    })
  })

  it("round-trips a rectangle through its polygon", () => {
    expect(bboxOf(rectPoints(5, 8, 20, 30))).toEqual({ x: 5, y: 8, width: 20, height: 30 })
  })

  it("serialises points for an svg polygon", () => {
    expect(
      toSvgPoints([
        { x: 1, y: 2 },
        { x: 3.5, y: 4 },
      ]),
    ).toBe("1,2 3.5,4")
  })
})
