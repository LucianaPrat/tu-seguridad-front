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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={HEAD_CELL}>Miembro</th>
                <th className={HEAD_CELL}>Email</th>
                <th className={HEAD_CELL}>Estado</th>
                <th className={HEAD_CELL}>Último acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 && pending.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    Todavía no hay miembros en este espacio.
                  </td>
                </tr>
              )}

              {rows.map((member) => (
                <tr key={`member-${member.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
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
                      <div>
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
                          <p className="text-xs text-gray-400">{member.phone}</p>
                        ) : (
                          <Badge variant="unconfigured" label="Perfil incompleto" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{member.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Nunca"}
                  </td>
                </tr>
              ))}

              {/* Invited and not joined yet: they are not members, so they carry
                  no state of their own beyond the pending badge. */}
              {pending.map((invitation) => (
                <tr key={`invite-${invitation.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Mail size={14} />
                      </div>
                      <p className="text-gray-500">Invitación pendiente</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{invitation.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="unconfigured" label="Pendiente" />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
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
