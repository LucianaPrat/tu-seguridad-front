/** Pure helpers behind MemberActivityCharts. No React, no i18n. */

/** Documented categorical palette, light mode, fixed slot order (validated). */
export const SERIES_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
]
/** The folded tail ("Otros"): de-emphasis gray, never a categorical slot. */
export const OTHER_COLOR = "#898781"
export const OTHER_KEY = "other"
/** Sequential blue ramp, steps 100 -> 700 (light = near zero). */
export const HEAT_RAMP = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
]

/** "125" -> "2h 5m". */
export function formatMinutes(minutes: number) {
  const total = Math.round(minutes)
  return `${Math.floor(total / 60)}h ${total % 60}m`
}

export interface PivotResult {
  /** Series keys, biggest total first; `other` is last when the tail was folded. */
  keys: string[]
  /** One row per day, zeros filled: `{ date, [key]: value }`. */
  rows: ({ date: string } & Record<string, number | string>)[]
}

/**
 * Pivot sparse (date, key, value) rows into one dense row per day. With more
 * than `max` distinct keys, keeps the top `max - 1` by total and folds the rest
 * into `other`.
 */
export function pivotByDay<R extends { date: string }>(
  days: string[],
  data: R[],
  keyOf: (r: R) => string,
  valueOf: (r: R) => number,
  max: number,
): PivotResult {
  const totals = new Map<string, number>()
  for (const r of data) totals.set(keyOf(r), (totals.get(keyOf(r)) ?? 0) + valueOf(r))
  const ranked = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)!)
  const folded = ranked.length > max
  const kept = folded ? ranked.slice(0, max - 1) : ranked
  const keys = folded ? [...kept, OTHER_KEY] : kept
  const rows = days.map((date) => {
    const row: PivotResult["rows"][number] = { date }
    for (const k of keys) row[k] = 0
    return row
  })
  const byDate = new Map(rows.map((row) => [row.date, row]))
  for (const r of data) {
    const row = byDate.get(r.date)
    if (!row) continue
    const k = kept.includes(keyOf(r)) ? keyOf(r) : OTHER_KEY
    row[k] = (row[k] as number) + valueOf(r)
  }
  return { keys, rows }
}

/**
 * Color follows the entity, not its rank: slots go by ascending id among the
 * keys on screen, so a series keeps its hue while the others change order.
 */
export function assignColors(keys: string[]): Record<string, string> {
  const colors: Record<string, string> = { [OTHER_KEY]: OTHER_COLOR }
  keys
    .filter((k) => k !== OTHER_KEY)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach((k, i) => (colors[k] = SERIES_COLORS[i % SERIES_COLORS.length]))
  return colors
}

/** Percent change vs the previous period; null when there is nothing to compare. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Largest whole unit that fits, as `Intl.RelativeTimeFormat` input (always past). */
export function relativeBucket(
  at: Date | string,
  now: Date = new Date(),
): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const seconds = Math.max(0, (now.getTime() - new Date(at).getTime()) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unit, size] of steps) {
    if (seconds >= size) return { value: -Math.floor(seconds / size), unit }
  }
  return { value: 0, unit: "minute" }
}

/** Heat step 0..6 for a value against the matrix maximum; -1 for no data. */
export function heatStep(value: number, max: number) {
  if (value <= 0 || max <= 0) return -1
  return Math.min(HEAT_RAMP.length - 1, Math.floor((value / max) * HEAT_RAMP.length))
}
