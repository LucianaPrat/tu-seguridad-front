import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as camerasApi from "@/api/cameras"
import { requestBlob } from "@/lib/http"
import { useSessionStore } from "@/stores/sessionStore"
import type { Camera, CameraSettings } from "@/api/cameras"
import type { LiveStreamResponse } from "@/lib/schemas"
import type { MonitorZone } from "@/data/mockData"

export const cameraKeys = {
  // Not `["cameras"]`: that is a prefix of `zones` and `live`, and
  // `invalidateQueries` prefix-matches, so invalidating the list would re-register
  // a camera with the media server.
  list: ["cameras", "list"] as const,
  zones: (cameraId: string) => ["cameras", cameraId, "zones"] as const,
  live: (cameraId: string) => ["cameras", cameraId, "live"] as const,
  snapshot: (url: string, version: string) => ["snapshot", url, version] as const,
}

export function useCameras() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery<Camera[]>({
    queryKey: cameraKeys.list,
    queryFn: camerasApi.listCameras,
    enabled: isLoggedIn,
  })
}

/** Disabled until a camera is selected — there is no zone route without one. */
export function useZones(cameraId: string) {
  return useQuery<MonitorZone[]>({
    queryKey: cameraKeys.zones(cameraId),
    queryFn: () => camerasApi.listZones(cameraId),
    enabled: cameraId !== "",
  })
}

interface SaveCameraInput {
  cameraId: string
  settings: CameraSettings
  /** Zones as the API last answered them — the baseline the diff runs against. */
  storedZones: MonitorZone[]
  zones: MonitorZone[]
}

/**
 * One save for the whole panel: the camera row first, then its zones. The
 * answer carries the stored zones so the caller can replace its local ones.
 */
export function useSaveCamera() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cameraId, settings, storedZones, zones }: SaveCameraInput) => {
      const camera = await camerasApi.updateCamera(cameraId, settings)
      const savedZones = await camerasApi.saveZones(cameraId, storedZones, zones)
      return { camera, zones: savedZones }
    },
    onSuccess: ({ camera, zones }) => {
      queryClient.setQueryData(cameraKeys.zones(camera.id), zones)
      queryClient.invalidateQueries({ queryKey: cameraKeys.list })
    },
  })
}

/** Flips one camera on or off. The list is what the dashboard buckets from. */
export function useSetCameraEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      camerasApi.setCameraEnabled(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cameraKeys.list }),
  })
}

/**
 * Where to play one camera. Mounted only while a card is hovered, so the query
 * lives and dies with the player.
 *
 * `retry: false` because the failures here are verdicts, not blips: a
 * deployment without MEDIAMTX_ENABLED answers 409 every single time, and three
 * attempts would only make that cost three requests. `retryOnMount: false` is
 * the same argument across hovers — `staleTime` does not apply to a query that
 * errored, so without it every re-hover of a streamless camera fires the 409
 * again. The long `staleTime` covers the success case: re-hovering a playing
 * card must not re-register it with the media server.
 */
export function useCameraLive(cameraId: string) {
  return useQuery<LiveStreamResponse>({
    queryKey: cameraKeys.live(cameraId),
    queryFn: () => camerasApi.getCameraLive(cameraId),
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60_000,
  })
}

export function useCaptureSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: camerasApi.captureSnapshot,
    // The fresh frame is what the camera list reports as latestSnapshotUrl.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cameraKeys.list }),
  })
}

/**
 * Snapshot bytes need the bearer header, so they are fetched and handed to the
 * `<img>` as an object URL. Revoked on unmount, otherwise every camera switch
 * leaks a blob.
 *
 * The live frame is one row per camera rewritten in place, so the URL stays the
 * same while the bytes change: `capturedAt` goes into the key, otherwise the
 * cache would serve the first frame of the session forever.
 */
export function useSnapshotImage(path: string | null, capturedAt: string | null) {
  const { data } = useQuery<Blob>({
    queryKey: cameraKeys.snapshot(path ?? "", capturedAt ?? ""),
    queryFn: () => requestBlob(path!),
    enabled: path !== null,
    staleTime: Infinity,
  })

  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!data) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [data])

  return objectUrl
}
