import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// jsdom has no layout engine, so Radix's pointer-capture calls are undefined.
// Stub them or every Popover/Dialog interaction throws.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom ships no media stack at all, so the help page's voice turn cannot even
// mount without these. Minimal fakes: the recorder hands back one chunk on stop.
if (!globalThis.MediaRecorder) {
  globalThis.MediaRecorder = class {
    static isTypeSupported = () => true
    state = "inactive"
    stream: MediaStream
    ondataavailable: ((event: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null

    constructor(stream: MediaStream) {
      this.stream = stream
    }

    start() {
      this.state = "recording"
    }

    stop() {
      this.state = "inactive"
      this.ondataavailable?.({ data: new Blob(["clip"], { type: "audio/webm" }) })
      this.onstop?.()
    }
  } as unknown as typeof MediaRecorder
}

if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream },
  })
}

if (!URL.createObjectURL) {
  URL.createObjectURL = () => "blob:audio"
  URL.revokeObjectURL = () => {}
}

afterEach(() => {
  cleanup()
  // Tests stub fetch per case; leaving one armed poisons the next file.
  vi.unstubAllGlobals()
})

// AppShell starts the onboarding tour when this flag is missing, and its
// overlay would swallow every click a page test makes. Seed it as already seen.
localStorage.setItem("ts-tour-done", "1")
