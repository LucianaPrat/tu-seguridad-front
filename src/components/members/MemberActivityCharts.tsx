import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useCameras } from "@/hooks/useCameras"
import { useMemberActivity, useMembers } from "@/hooks/useMembers"
import { useT } from "@/hooks/useT"
import { dateLocale } from "@/lib/i18n"
import type { TranslationKey } from "@/lib/i18n"
import { ApiError } from "@/lib/http"
import { displayName, initials } from "@/lib/members"
import {
  assignColors,
  formatMinutes,
  HEAT_RAMP,
  heatStep,
  OTHER_KEY,
  percentDelta,
  pivotByDay,
  relativeBucket,
} from "@/lib/memberActivity"
import type { ActivityDays } from "@/api/members"

const RANGES: { days: ActivityDays; label: TranslationKey }[] = [
  { days: 7, label: "members.activity.range.7" },
  { days: 30, label: "members.activity.range.30" },
  { days: 90, label: "members.activity.range.90" },
]
const MAX_SERIES = 7
// Chart chrome from the dataviz reference: recessive hairlines, muted axis ink.
const GRID = "#e1e0d9"
const AXIS = "#898781"
const SURFACE = "#fcfcfb"
const AXIS_TICK = { fontSize: 11, fill: AXIS }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </section>
  )
}

function Legend({
  keys,
  colors,
  name,
}: {
  keys: string[]
  colors: Record<string, string>
  name: (k: string) => string
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-600">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block w-3 h-0.5 rounded"
            style={{ background: colors[k] }}
          />
          {name(k)}
        </li>
      ))}
    </ul>
  )
}

interface TipProps {
  active?: boolean
  label?: string
  payload?: { dataKey?: string | number; value?: number }[]
  name: (k: string) => string
  colors: Record<string, string>
  date: (d: string) => string
  format: (n: number) => string
  total: string
}

/** One tooltip for every series at the hovered day: values lead, names follow. */
function SeriesTooltip({ active, label, payload, name, colors, date, format, total }: TipProps) {
  if (!active || !payload?.length) return null
  const rows = payload
    .map((p) => ({ key: String(p.dataKey), value: Number(p.value ?? 0) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const sum = rows.reduce((acc, r) => acc + r.value, 0)
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 text-gray-500">{date(String(label))}</p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-3 h-0.5 rounded"
            style={{ background: colors[r.key] }}
          />
          <span className="font-semibold text-gray-900">{format(r.value)}</span>
          <span className="text-gray-600">{name(r.key)}</span>
        </p>
      ))}
      {rows.length > 1 && (
        <p className="mt-1 border-t border-gray-100 pt-1 text-gray-600">
          <span className="font-semibold text-gray-900">{format(sum)}</span> {total}
        </p>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{text}</p>
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? 80 / (values.length - 1) : 0
  const points = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(18 - (v / max) * 16).toFixed(1)}`,
  )
  return (
    <svg width="80" height="20" viewBox="0 0 80 20" aria-hidden className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#2a78d6"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Kpi({
  label,
  value,
  sub,
  delta,
  noPrevious,
  vs,
}: {
  label: string
  value: string
  sub?: string
  delta?: number | null
  noPrevious?: string
  vs?: (d: string) => string
}) {
  let footer: React.ReactNode = sub ?? null
  if (delta === null) footer = noPrevious
  else if (delta !== undefined && vs) {
    footer = vs(`${delta > 0 ? "▲" : delta < 0 ? "▼" : "="} ${Math.abs(delta)}%`)
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 truncate">{value}</p>
      <p className="mt-1 text-xs text-gray-500 truncate">{footer}</p>
    </div>
  )
}

export default function MemberActivityCharts() {
  const { t, locale } = useT()
  const [days, setDays] = useState<ActivityDays>(30)
  const activity = useMemberActivity(days)
  const members = useMembers()
  const cameras = useCameras()
  const loc = dateLocale(locale)

  const roster = members.data?.items ?? []
  const userName = (id: string | number) => {
    const member = roster.find((m) => m.id === Number(id))
    return member ? displayName(member) : t("members.activity.unknownUser")
  }
  const cameraName = (id: string) =>
    cameras.data?.find((c) => c.id === id)?.name ?? t("members.activity.unknownCamera")
  const dayLabel = (iso: string, long = false) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(loc, {
      day: "numeric",
      month: "short",
      ...(long && { weekday: "short" }),
      timeZone: "UTC",
    })

  const data = activity.data
  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-base font-semibold text-gray-900">{t("members.activity.title")}</h2>
      <div role="group" aria-label={t("members.activity.range")} className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            aria-pressed={r.days === days}
            onClick={() => setDays(r.days)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border ${
              r.days === days
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t(r.label)}
          </button>
        ))}
      </div>
    </div>
  )

  if (activity.isPending) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {header}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t("members.activity.loading")}</p>
      </div>
    )
  }
  if (activity.isError || !data) {
    return (
      <div className="mt-6 space-y-3">
        {header}
        <p role="alert" className="text-sm text-destructive">
          {activity.error instanceof ApiError
            ? activity.error.message
            : t("members.activity.loadError")}
        </p>
      </div>
    )
  }

  // --- derived numbers -----------------------------------------------------
  const totalSessions = data.accessesByDay.reduce((a, r) => a + r.sessions, 0)
  const activeUsers = new Set(data.accessesByDay.filter((r) => r.sessions > 0).map((r) => r.userId))
    .size
  const totalMinutes = data.watchByDay.reduce((a, r) => a + r.minutes, 0)
  const minutesByCamera = new Map<string, number>()
  for (const r of data.watchByDay) {
    minutesByCamera.set(r.cameraId, (minutesByCamera.get(r.cameraId) ?? 0) + r.minutes)
  }
  const top = [...minutesByCamera].sort((a, b) => b[1] - a[1])[0]
  const hours = (m: number) => t("members.activity.hoursShort", { hours: (m / 60).toFixed(1) })
  const vs = (d: string) => t("members.activity.kpi.vsPrevious", { delta: d })
  const noPrevious = t("members.activity.kpi.noPrevious")

  const accesses = pivotByDay(
    data.days,
    data.accessesByDay,
    (r) => String(r.userId),
    (r) => r.sessions,
    MAX_SERIES,
  )
  const streaming = pivotByDay(
    data.days,
    data.watchByDay,
    (r) => r.cameraId,
    (r) => r.minutes / 60,
    MAX_SERIES,
  )
  const accessName = (k: string) => (k === OTHER_KEY ? t("members.activity.others") : userName(k))
  const streamName = (k: string) => (k === OTHER_KEY ? t("members.activity.others") : cameraName(k))
  const accessColors = assignColors(accesses.keys)
  const streamColors = assignColors(streaming.keys)
  const total = t("members.activity.total")

  const xAxis = (
    <XAxis
      dataKey="date"
      tick={AXIS_TICK}
      tickFormatter={(d: string) => dayLabel(d)}
      axisLine={{ stroke: GRID }}
      tickLine={false}
      minTickGap={24}
    />
  )
  const grid = <CartesianGrid stroke={GRID} vertical={false} />

  // Heatmap: rows users, cols cameras, only those with data.
  const heatUsers = [...new Set(data.watchByUserCamera.map((r) => r.userId))]
  const heatCams = [...new Set(data.watchByUserCamera.map((r) => r.cameraId))]
  const cell = new Map(data.watchByUserCamera.map((r) => [`${r.userId}|${r.cameraId}`, r.minutes]))
  const heatMax = Math.max(0, ...data.watchByUserCamera.map((r) => r.minutes))

  // Table: roster + anyone who shows up in the data but left the space.
  const lastAccess = new Map(data.lastAccess.map((r) => [r.userId, r.at]))
  const sessionsByUser = new Map<number, number>()
  for (const r of data.accessesByDay) {
    sessionsByUser.set(r.userId, (sessionsByUser.get(r.userId) ?? 0) + r.sessions)
  }
  const minutesByUser = new Map<number, number>()
  for (const r of data.watchByUserCamera) {
    minutesByUser.set(r.userId, (minutesByUser.get(r.userId) ?? 0) + r.minutes)
  }
  const ids = [
    ...new Set([...roster.map((m) => m.id), ...lastAccess.keys(), ...sessionsByUser.keys()]),
  ]
  const tableRows = ids
    .map((id) => ({
      id,
      member: roster.find((m) => m.id === id),
      at: lastAccess.get(id),
      sessions: sessionsByUser.get(id) ?? 0,
      minutes: minutesByUser.get(id) ?? 0,
      spark: data.days.map(
        (d) => data.accessesByDay.find((r) => r.userId === id && r.date === d)?.sessions ?? 0,
      ),
    }))
    .sort((a, b) => (a.at && b.at ? b.at.localeCompare(a.at) : a.at ? -1 : b.at ? 1 : a.id - b.id))
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" })

  return (
    <div className="mt-6 space-y-4">
      {header}
      <div className={`space-y-4 ${activity.isPlaceholderData ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label={t("members.activity.kpi.sessions")}
            value={String(totalSessions)}
            delta={percentDelta(totalSessions, data.previous.sessions)}
            noPrevious={noPrevious}
            vs={vs}
          />
          <Kpi
            label={t("members.activity.kpi.activeUsers")}
            value={String(activeUsers)}
            delta={percentDelta(activeUsers, data.previous.activeUsers)}
            noPrevious={noPrevious}
            vs={vs}
          />
          <Kpi
            label={t("members.activity.kpi.hours")}
            value={hours(totalMinutes)}
            delta={percentDelta(totalMinutes, data.previous.watchMinutes)}
            noPrevious={noPrevious}
            vs={vs}
          />
          <Kpi
            label={t("members.activity.kpi.topCamera")}
            value={top ? cameraName(top[0]) : "—"}
            sub={top ? formatMinutes(top[1]) : undefined}
          />
        </div>

        <ChartCard title={t("members.activity.chart.accesses")}>
          {totalSessions === 0 ? (
            <Empty text={t("members.activity.empty")} />
          ) : (
            <>
              {accesses.keys.length > 1 && (
                <Legend keys={accesses.keys} colors={accessColors} name={accessName} />
              )}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={accesses.rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  {grid}
                  {xAxis}
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ stroke: AXIS, strokeWidth: 1 }}
                    content={
                      <SeriesTooltip
                        name={accessName}
                        colors={accessColors}
                        date={(d) => dayLabel(d, true)}
                        format={(n) => String(n)}
                        total={total}
                      />
                    }
                  />
                  {accesses.keys.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={accessColors[k]}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>

        <ChartCard title={t("members.activity.chart.streaming")}>
          {totalMinutes === 0 ? (
            <Empty text={t("members.activity.empty")} />
          ) : (
            <>
              {streaming.keys.length > 1 && (
                <Legend keys={streaming.keys} colors={streamColors} name={streamName} />
              )}
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={streaming.rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  {grid}
                  {xAxis}
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(n: number) => String(Math.round(n * 10) / 10)}
                  />
                  <Tooltip
                    cursor={{ stroke: AXIS, strokeWidth: 1 }}
                    content={
                      <SeriesTooltip
                        name={streamName}
                        colors={streamColors}
                        date={(d) => dayLabel(d, true)}
                        format={(n) => t("members.activity.hoursShort", { hours: n.toFixed(1) })}
                        total={total}
                      />
                    }
                  />
                  {streaming.keys.map((k) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stackId="a"
                      stroke={streamColors[k]}
                      strokeWidth={1.5}
                      fill={streamColors[k]}
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>

        <ChartCard title={t("members.activity.chart.heatmap")}>
          {heatUsers.length === 0 ? (
            <Empty text={t("members.activity.empty")} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <div
                  role="table"
                  className="grid gap-0.5 text-xs text-gray-600 w-max min-w-full"
                  style={{
                    gridTemplateColumns: `minmax(8rem, auto) repeat(${heatCams.length}, minmax(4.5rem, 1fr))`,
                  }}
                >
                  <div />
                  {heatCams.map((c) => (
                    <div key={c} className="px-1 pb-1 text-center truncate" title={cameraName(c)}>
                      {cameraName(c)}
                    </div>
                  ))}
                  {heatUsers.map((u) => (
                    <div key={u} className="contents">
                      <div className="pr-2 py-1 truncate self-center">{userName(u)}</div>
                      {heatCams.map((c) => {
                        const minutes = cell.get(`${u}|${c}`) ?? 0
                        const step = heatStep(minutes, heatMax)
                        const label = t("members.activity.heatCell", {
                          user: userName(u),
                          camera: cameraName(c),
                          time: formatMinutes(minutes),
                        })
                        return (
                          <div
                            key={c}
                            role="img"
                            tabIndex={0}
                            aria-label={label}
                            title={label}
                            className="h-8 rounded-[4px] hover:ring-2 hover:ring-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 outline-none"
                            style={{ background: step < 0 ? "#f0efec" : HEAT_RAMP[step] }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                {t("members.activity.scaleLess")}
                <span
                  aria-hidden
                  className="h-2 w-24 rounded-full"
                  style={{ background: `linear-gradient(to right, ${HEAT_RAMP.join(",")})` }}
                />
                {t("members.activity.scaleMore")}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title={t("members.activity.chart.members")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">{t("members.activity.col.member")}</th>
                  <th className="py-2 pr-3 font-medium">{t("members.activity.col.lastAccess")}</th>
                  <th className="py-2 pr-3 font-medium text-right">
                    {t("members.activity.col.sessions")}
                  </th>
                  <th className="py-2 pr-3 font-medium">{t("members.activity.col.trend")}</th>
                  <th className="py-2 font-medium text-right">
                    {t("members.activity.col.streaming")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const rel = r.at ? relativeBucket(r.at) : null
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {r.member?.avatarUrl ? (
                            <img
                              src={r.member.avatarUrl}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                              {r.member ? initials(r.member) : "?"}
                            </div>
                          )}
                          <span className="truncate text-gray-900">{userName(r.id)}</span>
                        </div>
                      </td>
                      <td
                        className="py-2 pr-3 whitespace-nowrap text-gray-600"
                        title={
                          r.at
                            ? new Date(r.at).toLocaleString(loc, { timeZone: data.timezone })
                            : undefined
                        }
                      >
                        {rel ? rtf.format(rel.value, rel.unit) : t("members.never")}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-gray-900">
                        {r.sessions}
                      </td>
                      <td className="py-2 pr-3">
                        <Sparkline values={r.spark} />
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-900">
                        {hours(r.minutes)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
