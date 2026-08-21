/*
 * Zone geometry. Every coordinate is percent of frame, on both sides of the
 * API, so a resolution change does not move a zone.
 *
 * A zone is a free-hand polygon, and that outline is its only shape. The
 * bounding box is derived — `bboxOf` — wherever one is needed: the wire format
 * the API stores, and the label the UI hangs on a zone. Older stored zones are
 * rectangles, and `rectPoints` turns those into a polygon on the way in so the
 * editor only ever deals with one shape.
 */

export interface Point {
  x: number
  y: number
}

/**
 * What the API accepts in one outline (`ZoneGeometry.MAX_OUTLINE_POINTS`). A
 * real drag lands far below it; the editor stops adding detail at the cap so a
 * very long scribble cannot turn into a rejected save.
 */
export const MAX_POINTS = 500

export function bboxOf(points: Point[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export function rectPoints(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

/** `points` attribute of an SVG `<polygon>` in a `0 0 100 100` viewBox. */
export function toSvgPoints(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ")
}
