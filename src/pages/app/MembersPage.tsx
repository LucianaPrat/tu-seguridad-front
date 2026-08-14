import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import Badge from "@/components/common/Badge"
import InviteModal from "@/components/common/InviteModal"
import { MEMBERS } from "@/data/mockData"
import { UserPlus } from "lucide-react"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <AppShell>
      <PageHeader
        title="Miembros del espacio"
        subtitle={`${MEMBERS.length} usuarios registrados`}
        action={
          <Button icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
            Invitar miembro
          </Button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Miembro
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Último acceso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MEMBERS.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.firstName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1a6b61] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {member.firstName[0]}
                        {member.lastName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{member.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{member.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={member.isActive ? "active" : "inactive"} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(member.lastLogin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  )
}
