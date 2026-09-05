import { useEffect, useRef, useState } from "react"

/** Hard cap. 60s of opus sits far under the backend's 2 MB clip limit. */
const MAX_DURATION_MS = 60_000

const MIC_DENIED = "No pudimos acceder al micrófono. Revisá los permisos del navegador."
const MIC_MISSING = "No encontramos un micrófono en este dispositivo."

/*
 * Chrome and Firefox record opus in webm, Safari answers mp4. The backend hands
 * the clip to ffmpeg either way, so take whichever the browser admits to rather
 * than hardcoding one and locking the other out.
 */
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]

/**
 * getUserMedia + MediaRecorder, both native, no dependency. `onClip` receives
 * the recording once it stops — on the operator's stop or on the 60s cap, so a
 * caller never enforces a length by hand. `start` resolves to the failure copy
 * when the mic is unavailable and to `null` when recording began; the caller
 * renders that string in the thread, which is why there is no `error` state
 * here to read twice.
 *
 * Deviates from the TanStack-Query shape ARCHITECTURE.md describes for
 * `src/hooks/`: there is no server round-trip, only a start/stop lifecycle that
 * has no business living inside the page component.
 */
export function useVoiceRecorder(onClip: (blob: Blob) => void) {
  const [status, setStatus] = useState<"idle" | "recording">("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  // getUserMedia is awaited before the recorder exists, so the recorder ref
  // alone cannot tell a second start apart from the first — two clicks in that
  // gap would open two streams and leak the mic of the one that lost.
  const startingRef = useRef(false)
  const onClipRef = useRef(onClip)
  onClipRef.current = onClip

  function releaseStream() {
    const recorder = recorderRef.current
    if (!recorder) return
    /*
     * Ending the tracks stops the recorder too, asynchronously — with the
     * handlers still attached that fires a clip after unmount, which would send
     * the operator's last words to a page nobody is looking at (and, on an
     * expired token, navigate them to /login from wherever they went).
     */
    recorder.ondataavailable = null
    recorder.onstop = null
    recorder.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
  }

  // Live tracks keep the browser's recording indicator lit after the operator
  // leaves /help, so the unmount has to drop them too.
  useEffect(() => releaseStream, [])

  async function start(): Promise<string | null> {
    if (recorderRef.current || startingRef.current) return null
    startingRef.current = true
    try {
      return await open()
    } finally {
      startingRef.current = false
    }
  }

  async function open(): Promise<string | null> {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      // A missing mic and a denied mic need different answers: retrying the
      // same way fixes neither, and only one of them is about permissions.
      return (error as DOMException).name === "NotFoundError" ? MIC_MISSING : MIC_DENIED
    }

    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    let timer: number | undefined

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      window.clearTimeout(timer)
      releaseStream()
      setStatus("idle")
      if (chunks.length > 0) onClipRef.current(new Blob(chunks, { type: chunks[0].type }))
    }

    recorderRef.current = recorder
    recorder.start()
    setStatus("recording")
    timer = window.setTimeout(stop, MAX_DURATION_MS)
    return null
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
  }

  return { status, start, stop }
}
