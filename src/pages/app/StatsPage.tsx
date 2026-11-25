import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import MemberActivityCharts from "@/components/members/MemberActivityCharts"
import { useT } from "@/hooks/useT"

export default function StatsPage() {
  const { t } = useT()
  return (
    <AppShell>
      <PageHeader title={t("stats.title")} subtitle={t("stats.subtitle")} />
      <MemberActivityCharts />
    </AppShell>
  )
}
