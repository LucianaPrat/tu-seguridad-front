import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle, Clock, ImageOff, Mail, MessageSquare, Phone } from "lucide-react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Badge from "@/components/common/Badge"
import { useEvent } from "@/hooks/useEvents"
import { useMembers } from "@/hooks/useMembers"
import { useSnapshotImage } from "@/hooks/useCameras"
import { ApiError } from "@/lib/http"
import { displayName } from "@/lib/members"
import type { ChannelType } from "@/data/mockData"

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  llamada: <Phone size={13} />,
  whatsapp: <MessageSquare size={13} />,
  email: <Mail size={13} />,
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{children}</div>
    </div>
  )
}

/*
 * Where a row of the history table and the "Ver la alerta" button of an alert
 * email both land. Reads GET /events/:id rather than picking the row out of the
 * list cache: arriving from the mail there is no list loaded, and the event can
 * sit many pages back even when there is.
 */
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: event, isPending, isError, error } = useEvent(id ?? "")
  // The event carries `acknowledgedByUserId`; the roster is where the name is.
  const members = useMembers()

  // The stored frame never changes, so the detection time is a stable cache
  // version for it. Hook runs on every render — the path is what gates the fetch.
  const snapshot = useSnapshotImage(event?.snapshotUrl ?? null, event?.timestamp ?? null)

  const backLink = (
    <Link
      to="/events"
      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4 py-2"
    >
      <ArrowLeft size={14} />
      Volver a eventos
    </Link>
  )

  if (isPending) {
    return (
      <AppShell>
        {backLink}
        <p className="text-sm text-muted-foreground">Cargando alerta…</p>
      </AppShell>
    )
  }

  if (isError) {
    return (
      <AppShell>
        {backLink}
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "No pudimos cargar la alerta."}
        </p>
      </AppShell>
    )
  }

  const acknowledgedBy =
    (event.acknowledgedByUserId !== null &&
      (members.data?.items ?? [])
        .filter((member) => member.id === event.acknowledgedByUserId)
        .map(displayName)[0]) ||
    "un miembro"

  return (
    <AppShell>
      {backLink}
      <PageHeader
        title={event.cameraName}
        subtitle={formatTimestamp(event.timestamp)}
        action={<Badge variant={event.alertType} />}
      />

      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {snapshot ? (
            <img
              src={snapshot}
              alt={`Captura de ${event.cameraName} al momento de la alerta`}
              className="w-full max-h-[60dvh] object-contain bg-gray-900"
            />
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImageOff size={28} />
              <p className="text-xs">
                {event.snapshotUrl ? "Cargando captura…" : "Esta alerta no guardó una captura"}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 grid gap-4">
          <Fact label="Reconocimiento">
            {event.acknowledgedAt ? (
              <span className="flex items-start gap-1.5">
                <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
                <span>
                  Reconocido por {acknowledgedBy}
                  <span className="block text-gray-400 text-xs">
                    {formatTimestamp(event.acknowledgedAt)}
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400">
                <Clock size={15} />
                No reconocido
              </span>
            )}
          </Fact>

          <Fact label="Canales notificados">
            {event.channels.length === 0 ? (
              <span className="text-gray-400">Sin envío</span>
            ) : (
              <span className="flex flex-wrap items-center gap-3 text-gray-600">
                {event.channels.map((channel) => (
                  <span key={channel} className="flex items-center gap-1.5">
                    {CHANNEL_ICONS[channel]}
                    {CHANNEL_LABELS[channel]}
                  </span>
                ))}
              </span>
            )}
          </Fact>

          {/* Null on an alert recorded before the pipeline stored its detections. */}
          <Fact label="Personas detectadas">
            {event.personsDetected ?? <span className="text-gray-400">Sin dato</span>}
          </Fact>

          <Fact label="Confianza">
            {event.confidence !== null ? (
              `${Math.round(event.confidence * 100)}%`
            ) : (
              <span className="text-gray-400">Sin dato</span>
            )}
          </Fact>

          <Fact label="Identificador">
            <span className="font-mono text-xs text-gray-500 break-all">{event.id}</span>
          </Fact>
        </div>
      </div>
    </AppShell>
  )
}
