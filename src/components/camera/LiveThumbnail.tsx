import { useEffect, useRef } from "react"
import Hls from "hls.js"
import { useCameraLive } from "@/hooks/useCameras"
import { useSessionStore } from "@/stores/sessionStore"

interface LiveThumbnailProps {
  cameraId: string
  /** Fires once frames actually arrive — the card gates its "EN VIVO" pill on it. */
  onPlaying: () => void
}

/*
 * The live player. Mounted only while a card is hovered, so mount and unmount
 * are the whole lifecycle and there is no `active` flag to thread through.
 *
 * The playlist URL holds no secret: the media server calls the API to authorize
 * the playlist and every segment, so each request has to carry the caller's
 * bearer token. `<video src>` cannot attach a header, which is why this goes
 * through hls.js and its `xhrSetup` instead.
 *
 * Every failure is silent by design and leaves the stored snapshot underneath
 * showing: 409 means the camera is disabled or this deployment runs without
 * MEDIAMTX_ENABLED — the likely answer on a dev box — and 404/502/504 mean no
 * recorder, or a media server that refused or timed out. None of those is
 * something to interrupt an operator with.
 *
 * hls.js needs MSE. Every desktop browser has it; iOS Safari does not, and a
 * LAN operator console is not where that matters, so there is no native-HLS
 * fallback.
 *
 * ponytail: hls.js only, protocol is "hls" today. Branch here if a second
 * transport lands.
 */
export default function LiveThumbnail({ cameraId, onPlaying }: LiveThumbnailProps) {
  const { data } = useCameraLive(cameraId)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!data || !video || !Hls.isSupported()) return

    const hls = new Hls({
      xhrSetup: (xhr) => {
        // Read the token per request rather than closing over it: a refresh
        // mid-stream must not leave the segments authenticating with the token
        // that happened to be current at mount.
        const { accessToken } = useSessionStore.getState()
        if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
      },
    })
    hls.loadSource(data.url)
    hls.attachMedia(video)

    return () => hls.destroy()
  }, [data])

  if (!data) return null

  return (
    <video
      ref={videoRef}
      // Autoplay of an unmuted element is blocked, and there is no audio here.
      muted
      playsInline
      autoPlay
      onPlaying={onPlaying}
      className="absolute inset-0 w-full h-full object-cover"
    />
  )
}
