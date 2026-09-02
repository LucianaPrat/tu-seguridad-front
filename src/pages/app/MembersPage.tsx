import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import Badge from "@/components/common/Badge"
import InviteModal from "@/components/common/InviteModal"
import { useMembers } from "@/hooks/useMembers"
import { usePendingInvitations } from "@/hooks/useInvitations"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { displayName, initials } from "@/lib/members"
import { Mail, UserPlus } from "lucide-react"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const HEAD_CELL = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"

/*
 * Below `md` the table collapses into cards: the header hides, every row is a
 * block and every cell a line labelled by its own `data-label`. It stays one
 * copy of the DOM — a separate card list beside the table would render every
 * name and email twice, and both the screen readers and the tests read them one
 * at a time.
 */
const TABLE = "w-full text-sm max-md:block"
const ROW = "hover:bg-gray-50 transition-colors max-md:block max-md:px-4 max-md:py-3"
const CELL = "px-4 py-3 max-md:block max-md:px-0 max-md:py-1"
const LABELLED =
  `${CELL} max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 ` +
  "max-md:before:content-[attr(data-label)] max-md:before:shrink-0 max-md:before:text-xs " +
  "max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-wider " +
  "max-md:before:text-gray-400"

export default function MembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  // Inviting is admin-only on the backend, so a member gets no button rather
  // than a 403 behind one.
  const isAdmin = useSessionStore((state) => state.user?.role === "admin")
  const members = useMembers()
  // Admin only on the backend; disabled for a plain member, so `data` stays
  // undefined there and no pending rows render.
  const invitations = usePendingInvitations()

  const rows = members.data?.items ?? []
  const pending = invitations.data?.items ?? []

  return (
    <AppShell>
      <PageHeader
        title="Miembros del espacio"
        subtitle={
          members.data ? `${members.data.total} usuarios registrados` : "Cargando miembros…"
        }
        action={
          isAdmin ? (
            <Button icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
              Invitar miembro
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {members.isPending ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando miembros…</p>
        ) : members.isError ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {members.error instanceof ApiError
              ? members.error.message
              : "No pudimos cargar los miembros del espacio."}
          </p>
        ) : (
          <table role="table" className={TABLE}>
            <thead role="rowgroup" className="max-md:hidden">
              <tr role="row" className="border-b border-gray-100">
                <th role="columnheader" className={HEAD_CELL}>
                  Miembro
                </th>
                <th role="columnheader" className={HEAD_CELL}>
                  Email
                </th>
                <th role="columnheader" className={HEAD_CELL}>
                  Estado
                </th>
                <th role="columnheader" className={HEAD_CELL}>
                  Último acceso
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="divide-y divide-gray-50 max-md:block">
              {rows.length === 0 && pending.length === 0 && (
                <tr role="row">
                  <td
                    role="cell"
                    colSpan={4}
                    className="px-4 py-6 text-muted-foreground max-md:block"
                  >
                    Todavía no hay miembros en este espacio.
                  </td>
                </tr>
              )}

              {rows.map((member) => (
                <tr role="row" key={`member-${member.id}`} className={ROW}>
                  <td role="cell" className={CELL}>
                    <div className="flex items-center gap-3 min-w-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={displayName(member)}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {initials(member)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className={
                            member.profileCompleted
                              ? "font-medium text-gray-900"
                              : "font-medium text-gray-400"
                          }
                        >
                          {displayName(member)}
                        </p>
                        {member.profileCompleted ? (
                          <p className="text-xs text-gray-400 truncate">{member.phone}</p>
                        ) : (
                          <Badge variant="unconfigured" label="Perfil incompleto" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    role="cell"
                    data-label="Email"
                    className={`${LABELLED} text-gray-600 max-md:break-all`}
                  >
                    {member.email}
                  </td>
                  <td role="cell" data-label="Estado" className={LABELLED}>
                    <Badge variant={member.isActive ? "active" : "inactive"} />
                  </td>
                  <td
                    role="cell"
                    data-label="Último acceso"
                    className={`${LABELLED} text-gray-500 text-xs`}
                  >
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Nunca"}
                  </td>
                </tr>
              ))}

              {/* Invited and not joined yet: they are not members, so they carry
                  no state of their own beyond the pending badge. */}
              {pending.map((invitation) => (
                <tr role="row" key={`invite-${invitation.id}`} className={ROW}>
                  <td role="cell" className={CELL}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Mail size={14} />
                      </div>
                      <p className="text-gray-500">Invitación pendiente</p>
                    </div>
                  </td>
                  <td
                    role="cell"
                    data-label="Email"
                    className={`${LABELLED} text-gray-600 max-md:break-all`}
                  >
                    {invitation.email}
                  </td>
                  <td role="cell" data-label="Estado" className={LABELLED}>
                    <Badge variant="unconfigured" label="Pendiente" />
                  </td>
                  <td
                    role="cell"
                    data-label="Último acceso"
                    className={`${LABELLED} text-gray-500 text-xs`}
                  >
                    Expira {formatDate(invitation.expiresAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  )
}
