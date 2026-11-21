import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import MyInvitationsList from "@/components/spaces/MyInvitationsList"
import { useT } from "@/hooks/useT"

export default function InvitationsPage() {
  const { t } = useT()
  return (
    <AppShell>
      <PageHeader title={t("invitations.title")} />
      <MyInvitationsList />
    </AppShell>
  )
}
