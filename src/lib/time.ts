/**
 * Age of a timestamp the way the camera panel says it: "2 min", "1 h", "3 d".
 * Null in, null out — a camera that never stored a frame has no age to show.
 *
 * Plain arithmetic on purpose: `Intl.RelativeTimeFormat` would say "hace 2
 * minutos", and these are terse labels squeezed into a card footer.
 */
export function relativeTime(iso: string | null): string | null {
  if (iso === null) return null

  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null

  const minutes = Math.floor(ms / 60_000)
  // Covers clock skew too: a frame stamped in the future reads as "ahora"
  // rather than as a negative age.
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`

  return `${Math.floor(hours / 24)} d`
}
