/** Brand lens mark, white on whatever tile wraps it. Same glyph as public/favicon.svg. */
export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="7 7 18 18" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="16" r="7.7" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="3.4" fill="#fff" />
      <circle cx="20.7" cy="11.3" r="1.4" fill="#7fd3c6" />
    </svg>
  )
}
