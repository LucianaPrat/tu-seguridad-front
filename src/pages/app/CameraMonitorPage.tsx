import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import FormField from "@/components/common/FormField"
import AlertTypeToggle from "@/components/common/AlertTypeToggle"
import ZoneEditor from "@/components/zone-editor/ZoneEditor"
import ZoneList from "@/components/zone-editor/ZoneList"
import {
  useCameras,
  useCaptureSnapshot,
  useSaveCamera,
  useSnapshotImage,
  useZones,
} from "@/hooks/useCameras"
import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"
import type { AlertType, MonitorMode, MonitorZone } from "@/data/mockData"
import { Camera as CameraIcon, Check, Maximize2, PenTool } from "lucide-react"

interface Draft {
  name: string
  location: string
  monitorMode: MonitorMode
  alertType: AlertType
  zones: MonitorZone[]
}

const CARD = "bg-card rounded-2xl border border-gray-100 shadow-sm p-4"

const MODES = [
  {
    mode: "full" as MonitorMode,
    label: "Monitoreo completo",
    hint: "Toda la imagen",
    Icon: Maximize2,
  },
  {
    mode: "partial" as MonitorMode,
    label: "Monitoreo parcial",
    hint: "Zonas específicas",
    Icon: PenTool,
  },
]

/*
 * The frame is the workspace, so it gets the height and the settings get a
 * rail: rail | frame | inspector, each scrolling on its own above `xl`, so
 * drawing a zone never starts with a scroll and a refreshed capture cannot
 * move the page under the cursor.
 *
 * ponytail: 15rem is the chrome around the frame — TopBar h-14, the p-6 of
 * `main`, the page header and the toolbar row. Remeasure if that chrome moves.
 */
const FRAME_HEIGHT = { "--frame-max-h": "calc(100dvh - 15rem)" } as CSSProperties

/**
 * A recorder frame is small — 704x576, 1280x720 — and a wide monitor offers far
 * more room than that. Blowing it up fills the column with mush and buys
 * nothing: zones are percent of frame, so a bigger picture is not a more
 * precise one. Past this much of its own resolution the frame stops growing.
 */
const MAX_UPSCALE = 1.25

/**
 * The one rule that sizes the frame: as wide as the column allows, but never
 * past the height that keeps it on screen, and never past what the picture has
 * the pixels for. Width is what carries it — the box is `w-full` inside, so the
 * zone overlay lands on the picture and not beside it.
 */
function frameWidth(natural: { width: number; height: number } | null): CSSProperties {
  const { width, height } = natural ?? { width: 16, height: 9 }
  const ceiling = natural ? `${Math.round(natural.width * MAX_UPSCALE)}px` : "100%"
  return { width: `min(100%, ${ceiling}, calc(var(--frame-max-h) * ${width / height}))` }
}

/** Long enough that typing a name is one save, short enough to feel immediate. */
const AUTOSAVE_DELAY = 700

/**
 * What the API actually stores. Zone ids stay out: a freshly drawn zone carries
 * a local one until a save answers with the stored id, and counting that as a
 * change would make every save trigger the next one.
 */
function signature(draft: Draft) {
  return JSON.stringify({
    name: draft.name,
    location: draft.location,
    monitorMode: draft.monitorMode,
    alertType: draft.alertType,
    zones: draft.zones.map((zone) => ({ points: zone.points, alertType: zone.alertType })),
  })
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "No pudimos guardar los cambios"
}

export default function CameraMonitorPage() {
  const { data: cameras, isPending, error } = useCameras()
  // The dashboard deep-links here with the camera it wants configured. Read once
  // — after that the list on the left is what picks.
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("camera"))

  // `?? cameras[0]` is right only while nothing was asked for. A non-null id
  // that resolves to nothing — a stale bookmark, a camera the recorder no longer
  // reports — must not fall through to camera 0: that is the wrong-camera write
  // this deep link exists to kill.
  const selected = selectedId
    ? (cameras?.find((camera) => camera.id === selectedId) ?? null)
    : (cameras?.[0] ?? null)
  const notFound = selectedId !== null && !selected && (cameras?.length ?? 0) > 0

  // Zones live behind their own route, so the panel waits for both queries.
  const { data: storedZones } = useZones(selected?.id ?? "")
  const snapshotUrl = useSnapshotImage(
    selected?.snapshotUrl ?? null,
    selected?.lastSnapshotAt ?? null,
  )
  const save = useSaveCamera()
  const capture = useCaptureSnapshot()

  const [draft, setDraft] = useState<Draft | null>(null)
  const draftedCameraId = useRef<string | null>(null)
  /** The last shape handed to the API — what "no pending change" compares against. */
  const savedSignature = useRef<string | null>(null)
  /** Read off the frame itself: cameras do not all answer the same resolution. */
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)

  // Reload the draft when the operator picks another camera — and only then, so
  // a refetch landing mid-edit cannot wipe what they drew.
  useEffect(() => {
    if (!selected || !storedZones || draftedCameraId.current === selected.id) return
    draftedCameraId.current = selected.id
    const loaded: Draft = {
      name: selected.name,
      location: selected.location ?? "",
      monitorMode: selected.monitorMode,
      alertType: selected.alertType ?? "intruso",
      zones: storedZones,
    }
    savedSignature.current = signature(loaded)
    setNatural(null)
    setDraft(loaded)
  }, [selected, storedZones])

  // The poller only stores a frame when an alert fires, so a camera that never
  // alerted has nothing to show. Both modes display the frame — partial draws
  // on it, full uses it as the reference — so pull one on the first visit.
  const capturedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!selected || selected.snapshotUrl) return
    if (capturedFor.current === selected.id) return
    capturedFor.current = selected.id
    capture.mutate(selected.id)
  }, [selected, capture.mutate])

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const pending = draft !== null && signature(draft) !== savedSignature.current

  /*
   * No save button: the panel writes itself once the operator stops. `draft`
   * is a new object per keystroke, so the cleanup restarts the timer and the
   * name lands as one request instead of one per letter.
   *
   * The baseline moves when the request leaves, not when it answers: advancing
   * it on success would let the edits made while it was in flight look saved.
   * A failure therefore stands until the next edit — which is what the error
   * beside the title is for.
   */
  useEffect(() => {
    if (!selected || !draft || !storedZones || !pending) return
    // Blank is a 400, and the operator clearing the field to retype it would
    // spend one failed request on the pause.
    if (!draft.name.trim()) return

    const timer = setTimeout(() => {
      savedSignature.current = signature(draft)
      save.mutate(
        {
          cameraId: selected.id,
          settings: {
            name: draft.name,
            location: draft.location,
            monitorMode: draft.monitorMode,
            alertType: draft.alertType,
          },
          storedZones,
          zones: draft.zones,
        },
        // The answer carries the stored ids, so the freshly drawn zones stop
        // being local and a second save updates them instead of duplicating.
        { onSuccess: ({ zones }) => updateDraft({ zones }) },
      )
    }, AUTOSAVE_DELAY)

    return () => clearTimeout(timer)
  }, [selected, draft, storedZones, pending, save.mutate])

  return (
    <AppShell>
      <div className="flex flex-col min-h-0 xl:h-full">
        <PageHeader
          title="Comportamiento de monitoreo"
          subtitle="Configurá cómo cada cámara detecta y alerta eventos de seguridad."
          action={
            draft && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {save.isError ? (
                  <span className="text-destructive">No se pudo guardar</span>
                ) : pending || save.isPending ? (
                  "Guardando…"
                ) : (
                  <>
                    <Check size={13} className="text-primary" />
                    Guardado
                  </>
                )}
              </p>
            )
          }
        />

        {isPending && <p className="text-sm text-gray-500">Cargando cámaras…</p>}
        {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}
        {cameras?.length === 0 && (
          <p className="text-sm text-gray-500">
            El grabador no reportó cámaras todavía. Revisá la configuración del DVR.
          </p>
        )}

        {cameras && cameras.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 xl:flex-row">
            {/* Camera rail — a column beside the frame, a strip above it when
                the viewport is too narrow to afford the column. */}
            <div className="shrink-0 xl:w-44 xl:min-h-0 xl:flex xl:flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Cámaras
              </p>
              <ul className="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pb-0">
                {cameras.map((camera) => (
                  <li key={camera.id} className="shrink-0 xl:shrink xl:w-full">
                    <button
                      onClick={() => setSelectedId(camera.id)}
                      className={cn(
                        "w-40 xl:w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                        camera.id === selected?.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-card border border-gray-100 text-gray-700 hover:border-gray-200",
                      )}
                    >
                      <p className="font-medium truncate">{camera.name}</p>
                      <p
                        className={cn(
                          "text-xs truncate",
                          camera.id === selected?.id
                            ? "text-primary-foreground/70"
                            : "text-gray-400",
                        )}
                      >
                        {camera.location ?? `Canal ${camera.externalId}`}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {notFound && (
              <p className="text-sm text-gray-500">
                La cámara del enlace ya no está disponible. Elegí otra de la lista.
              </p>
            )}
            {selected && !draft && <p className="text-sm text-gray-500">Cargando configuración…</p>}

            {selected && draft && (
              <>
                {/* Canvas: the frame, and the two controls that act on it. The
                    width rule sits on the column, so the toolbar keeps the
                    frame's width instead of stretching across the screen. */}
                <section className="flex-1 min-w-0 min-h-0 flex flex-col" style={FRAME_HEIGHT}>
                  <div className="min-h-0 flex flex-col gap-3" style={frameWidth(natural)}>
                    {!snapshotUrl && (
                      <p className="text-sm text-gray-500 bg-card border border-gray-100 rounded-2xl p-10 text-center">
                        {capture.isPending
                          ? "Pidiéndole una captura a la cámara…"
                          : "Todavía no hay una captura de esta cámara. Tomá una para ver qué mira."}
                      </p>
                    )}

                    {snapshotUrl && draft.monitorMode === "partial" && (
                      <ZoneEditor
                        imageUrl={snapshotUrl}
                        zones={draft.zones}
                        onChange={(zones) => updateDraft({ zones })}
                        defaultAlertType={draft.alertType}
                        onFrameLoad={setNatural}
                      />
                    )}

                    {snapshotUrl && draft.monitorMode === "full" && (
                      <div className="relative rounded-xl overflow-hidden">
                        <img
                          src={snapshotUrl}
                          alt="Captura de la cámara"
                          className="block w-full h-auto"
                          onLoad={(e) =>
                            setNatural({
                              width: e.currentTarget.naturalWidth,
                              height: e.currentTarget.naturalHeight,
                            })
                          }
                        />
                        <div
                          className={cn(
                            "absolute inset-0 border-2 rounded-xl",
                            draft.alertType === "intruso"
                              ? "border-red-500 bg-red-500/20"
                              : "border-amber-500 bg-amber-500/20",
                          )}
                        />
                        <span
                          className={cn(
                            "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold text-white",
                            draft.alertType === "intruso" ? "bg-red-500" : "bg-amber-500",
                          )}
                        >
                          Toda la imagen ·{" "}
                          {draft.alertType === "intruso" ? "Intruso" : "Sospechoso"}
                        </span>
                      </div>
                    )}

                    <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap">
                      {draft.monitorMode === "partial" ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500">Dibujar como:</span>
                          <AlertTypeToggle
                            value={draft.alertType}
                            onChange={(alertType) => updateDraft({ alertType })}
                            size="sm"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Todo lo que entre en la imagen genera una alerta.
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<CameraIcon size={14} />}
                        onClick={() => capture.mutate(selected.id)}
                        loading={capture.isPending}
                      >
                        Actualizar imagen
                      </Button>
                    </div>

                    {capture.error && (
                      <p className="shrink-0 text-sm text-red-600">{errorMessage(capture.error)}</p>
                    )}
                  </div>
                </section>

                {/* Inspector: everything that is not the frame. */}
                <aside className="shrink-0 flex flex-col gap-4 xl:w-80 xl:min-h-0 xl:overflow-y-auto">
                  {save.error && <p className="text-sm text-red-600">{errorMessage(save.error)}</p>}

                  <div className={cn(CARD, "flex flex-col gap-3")}>
                    <FormField
                      label="Nombre personalizado"
                      value={draft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                    />
                    <FormField
                      label="Ubicación"
                      value={draft.location}
                      placeholder="Frente de casa"
                      onChange={(e) => updateDraft({ location: e.target.value })}
                    />
                  </div>

                  <div className={CARD}>
                    <p className="text-sm font-medium text-gray-700 mb-3">Modo de monitoreo</p>
                    <div className="flex flex-col gap-2">
                      {MODES.map(({ mode, label, hint, Icon }) => (
                        <button
                          key={mode}
                          onClick={() => updateDraft({ monitorMode: mode })}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors",
                            draft.monitorMode === mode
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-gray-200 text-gray-600 hover:border-gray-300",
                          )}
                        >
                          <Icon size={16} className="shrink-0" />
                          <span>
                            <span className="block font-medium">{label}</span>
                            <span className="block text-xs opacity-70">{hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {draft.monitorMode === "full" ? (
                    <div className={CARD}>
                      <p className="text-sm font-medium text-gray-700 mb-2">Nivel de alerta</p>
                      <AlertTypeToggle
                        value={draft.alertType}
                        onChange={(alertType) => updateDraft({ alertType })}
                      />
                    </div>
                  ) : (
                    <div className={CARD}>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Zonas de monitoreo ({draft.zones.length})
                      </p>
                      <ZoneList
                        zones={draft.zones}
                        onRemove={(id) =>
                          updateDraft({ zones: draft.zones.filter((zone) => zone.id !== id) })
                        }
                        onChangeAlertType={(id, type) =>
                          updateDraft({
                            zones: draft.zones.map((zone) =>
                              zone.id === id ? { ...zone, alertType: type } : zone,
                            ),
                          })
                        }
                      />
                    </div>
                  )}
                </aside>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
