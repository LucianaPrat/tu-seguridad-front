import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as camerasApi from "@/api/cameras"
import { requestBlob } from "@/lib/http"
import { useSessionStore } from "@/stores/sessionStore"
import type { Camera, CameraSettings } from "@/api/cameras"
import type { MonitorZone } from "@/data/mockData"

export const cameraKeys = {
  all: ["cameras"] as const,
  zones: (cameraId: string) => ["cameras", cameraId, "zones"] as const,
  snapshot: (url: string, version: string) => ["snapshot", url, version] as const,
}

export function useCameras() {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  return useQuery<Camera[]>({
    queryKey: cameraKeys.all,
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.all })
    },
  })
}

export function useCaptureSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: camerasApi.captureSnapshot,
    // The fresh frame is what the camera list reports as latestSnapshotUrl.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cameraKeys.all }),
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
