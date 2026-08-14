import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import ZoneEditor from "@/components/zone-editor/ZoneEditor"
import ZoneList from "@/components/zone-editor/ZoneList"
import { CAMERAS, type Camera, type AlertType, type MonitorZone } from "@/data/mockData"
import { Save } from "lucide-react"

export default function CameraMonitorPage() {
  const [cameras, setCameras] = useState<Camera[]>(CAMERAS)
  const [selectedId, setSelectedId] = useState<string>(CAMERAS[0].id)
  const [saved, setSaved] = useState(false)

  const selected = cameras.find((c) => c.id === selectedId)!

  function updateCamera(patch: Partial<Camera>) {
    setCameras((cs) => cs.map((c) => (c.id === selectedId ? { ...c, ...patch } : c)))
  }

  function handleZonesChange(zones: MonitorZone[]) {
    updateCamera({ zones })
  }

  function handleZoneAlertType(id: string, type: AlertType) {
    updateCamera({
      zones: selected.zones.map((z) => (z.id === id ? { ...z, alertType: type } : z)),
    })
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <PageHeader
        title="Comportamiento de monitoreo"
        subtitle="Configurá cómo cada cámara detecta y alerta eventos de seguridad."
        action={
          <Button icon={<Save size={14} />} onClick={handleSave}>
            {saved ? "Guardado" : "Guardar cambios"}
          </Button>
        }
      />

      <div className="flex gap-5 min-h-0">
        {/* Camera list */}
        <div className="w-52 shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Cámaras
          </p>
          <ul className="flex flex-col gap-1">
            {cameras.map((cam) => (
              <li key={cam.id}>
                <button
                  onClick={() => setSelectedId(cam.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    cam.id === selectedId
                      ? "bg-[#1a6b61] text-white font-medium"
                      : "bg-white border border-gray-100 text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <p className="font-medium truncate">{cam.name}</p>
                  <p
                    className={`text-xs truncate ${cam.id === selectedId ? "text-white/70" : "text-gray-400"}`}
                  >
                    {cam.location}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Config panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Camera name */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Nombre personalizado
            </label>
            <input
              value={selected.name}
              onChange={(e) => updateCamera({ name: e.target.value })}
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
                  onClick={() => updateCamera({ monitorMode: mode })}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    selected.monitorMode === mode
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
            {selected.monitorMode === "full" && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Tipo de alerta</p>
                <div className="flex gap-2">
                  {(["intruso", "sospechoso"] as AlertType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateCamera({ alertType: type })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                        selected.alertType === type
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

          {/* Partial mode: zone editor */}
          {selected.monitorMode === "partial" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Zonas de monitoreo</p>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500">Tipo por defecto:</span>
                  <select
                    value={selected.alertType ?? "intruso"}
                    onChange={(e) => updateCamera({ alertType: e.target.value as AlertType })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30"
                  >
                    <option value="intruso">Intruso</option>
                    <option value="sospechoso">Sospechoso</option>
                  </select>
                </div>
              </div>
              <ZoneEditor
                imageUrl={selected.snapshotUrl}
                zones={selected.zones}
                onChange={handleZonesChange}
                defaultAlertType={selected.alertType ?? "intruso"}
              />
              <div className="mt-4">
                <ZoneList
                  zones={selected.zones}
                  onRemove={(id) => handleZonesChange(selected.zones.filter((z) => z.id !== id))}
                  onChangeAlertType={handleZoneAlertType}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
