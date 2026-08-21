import { useEffect, useRef, useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
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
import type { AlertType, MonitorMode, MonitorZone } from "@/data/mockData"
import { Camera as CameraIcon, Save } from "lucide-react"

interface Draft {
  name: string
  location: string
  monitorMode: MonitorMode
  alertType: AlertType
  zones: MonitorZone[]
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "No pudimos guardar los cambios"
}

export default function CameraMonitorPage() {
  const { data: cameras, isPending, error } = useCameras()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = cameras?.find((camera) => camera.id === selectedId) ?? cameras?.[0] ?? null

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

  // Reload the draft when the operator picks another camera — and only then, so
  // a refetch landing mid-edit cannot wipe what they drew.
  useEffect(() => {
    if (!selected || !storedZones || draftedCameraId.current === selected.id) return
    draftedCameraId.current = selected.id
    setDraft({
      name: selected.name,
      location: selected.location ?? "",
      monitorMode: selected.monitorMode,
      alertType: selected.alertType ?? "intruso",
      zones: storedZones,
    })
  }, [selected, storedZones])

  // The poller only stores a frame when an alert fires, so a camera that never
  // alerted has nothing to draw on. Pull one the first time zones are opened.
  const capturedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!selected || selected.snapshotUrl || draft?.monitorMode !== "partial") return
    if (capturedFor.current === selected.id) return
    capturedFor.current = selected.id
    capture.mutate(selected.id)
  }, [selected, draft?.monitorMode, capture.mutate])

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function handleSave() {
    if (!selected || !draft || !storedZones) return
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
  }

  return (
    <AppShell>
      <PageHeader
        title="Comportamiento de monitoreo"
        subtitle="Configurá cómo cada cámara detecta y alerta eventos de seguridad."
        action={
          <Button
            icon={<Save size={14} />}
            onClick={handleSave}
            loading={save.isPending}
            disabled={!draft}
          >
            {save.isSuccess ? "Guardado" : "Guardar cambios"}
          </Button>
        }
      />

      {isPending && <p className="text-sm text-gray-500">Cargando cámaras…</p>}
      {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}
      {cameras?.length === 0 && (
        <p className="text-sm text-gray-500">
          El grabador no reportó cámaras todavía. Revisá la configuración del DVR.
        </p>
      )}

      {selected && (
        <div className="flex gap-5 min-h-0">
          {/* Camera list */}
          <div className="w-52 shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Cámaras
            </p>
            <ul className="flex flex-col gap-1">
              {cameras?.map((camera) => (
                <li key={camera.id}>
                  <button
                    onClick={() => setSelectedId(camera.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      camera.id === selected.id
                        ? "bg-[#1a6b61] text-white font-medium"
                        : "bg-white border border-gray-100 text-gray-700 hover:border-gray-200"
                    }`}
                  >
                    <p className="font-medium truncate">{camera.name}</p>
                    <p
                      className={`text-xs truncate ${camera.id === selected.id ? "text-white/70" : "text-gray-400"}`}
                    >
                      {camera.location ?? `Canal ${camera.externalId}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Config panel */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {!draft && <p className="text-sm text-gray-500">Cargando configuración…</p>}

            {draft && (
              <>
                {save.error && <p className="text-sm text-red-600">{errorMessage(save.error)}</p>}

                {/* Camera name */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Nombre personalizado
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 focus:border-[#1a6b61]"
                  />

                  <label className="text-sm font-medium text-gray-700 block mt-3 mb-1.5">
                    Ubicación
                  </label>
                  <input
                    value={draft.location}
                    onChange={(e) => updateDraft({ location: e.target.value })}
                    placeholder="Frente de casa"
                    className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 focus:border-[#1a6b61]"
                  />
                </div>

                {/* Mode selector */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Modo de monitoreo</p>
                  <div className="flex gap-3">
                    {(["full", "partial"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateDraft({ monitorMode: mode })}
                        className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                          draft.monitorMode === mode
                            ? "border-[#1a6b61] bg-teal-50 text-[#1a6b61]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {mode === "full" ? "🔲 Monitoreo completo" : "✏️ Monitoreo parcial"}
                        <p className="text-xs font-normal mt-0.5 opacity-70">
                          {mode === "full" ? "Toda la imagen" : "Zonas específicas"}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Full mode: single alert type */}
                  {draft.monitorMode === "full" && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tipo de alerta</p>
                      <div className="flex gap-2">
                        {(["intruso", "sospechoso"] as AlertType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateDraft({ alertType: type })}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                              draft.alertType === type
                                ? type === "intruso"
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : "border-amber-400 bg-amber-50 text-amber-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {type === "intruso" ? "🔴 Intruso" : "🟡 Sospechoso"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Partial mode: zone editor over the real camera frame */}
                {draft.monitorMode === "partial" && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Zonas de monitoreo</p>
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<CameraIcon size={14} />}
                          onClick={() => capture.mutate(selected.id)}
                          loading={capture.isPending}
                        >
                          Actualizar imagen
                        </Button>
                        <span className="text-xs text-gray-500">Tipo por defecto:</span>
                        <select
                          value={draft.alertType}
                          onChange={(e) => updateDraft({ alertType: e.target.value as AlertType })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30"
                        >
                          <option value="intruso">Intruso</option>
                          <option value="sospechoso">Sospechoso</option>
                        </select>
                      </div>
                    </div>

                    {capture.error && (
                      <p className="text-sm text-red-600 mb-2">{errorMessage(capture.error)}</p>
                    )}

                    {snapshotUrl ? (
                      <ZoneEditor
                        imageUrl={snapshotUrl}
                        zones={draft.zones}
                        onChange={(zones) => updateDraft({ zones })}
                        defaultAlertType={draft.alertType}
                      />
                    ) : (
                      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
                        {capture.isPending
                          ? "Pidiéndole una captura a la cámara…"
                          : "Todavía no hay una captura de esta cámara. Tomá una para dibujar las zonas."}
                      </p>
                    )}

                    <div className="mt-4">
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
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
