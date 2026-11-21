import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import PhoneField from "@/components/common/PhoneField"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import NotImplemented from "@/components/common/NotImplemented"
import { useSessionStore } from "@/stores/sessionStore"
import { useT } from "@/hooks/useT"
import { isLocale } from "@/lib/i18n"
import { ApiError } from "@/lib/http"
import { useChangePassword, useUpdateLocale, useUpdateProfile } from "@/hooks/useAuth"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  profilePasswordSchema,
  profileSchema,
  type ProfilePasswordValues,
  type ProfileValues,
} from "@/lib/schemas"
import { Camera, CheckCircle, Loader2, Lock, User, type LucideIcon } from "lucide-react"

const AUTOSAVE_MS = 800
const FIELDS = ["firstName", "lastName", "phone"] as const

const TABS = [
  { id: "personal", icon: User, label: "profile.personalInfo" },
  { id: "security", icon: Lock, label: "profile.security" },
] as const satisfies readonly { id: string; icon: LucideIcon; label: string }[]
type TabId = (typeof TABS)[number]["id"]

export default function ProfilePage() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const tab: TabId = params.get("tab") === "security" ? "security" : "personal"
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    personal: null,
    security: null,
  })

  function select(id: TabId) {
    setParams({ tab: id }, { replace: true })
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = ["ArrowRight", "ArrowDown"].includes(e.key)
      ? 1
      : ["ArrowLeft", "ArrowUp"].includes(e.key)
        ? -1
        : 0
    if (!step) return
    e.preventDefault()
    const index = TABS.findIndex((x) => x.id === tab)
    const next = TABS[(index + step + TABS.length) % TABS.length].id
    select(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <AppShell>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <div className="flex max-w-4xl flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div
          role="tablist"
          aria-label={t("profile.title")}
          onKeyDown={onKeyDown}
          className="sticky top-0 z-10 grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 md:static md:flex md:w-56 md:shrink-0 md:flex-col md:border-0 md:bg-transparent md:p-0"
        >
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => select(id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 md:justify-start",
                tab === id
                  ? "bg-[#1d7068] text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={16} />
              {t(label)}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="min-w-0 flex-1 rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
        >
          {tab === "personal" ? <PersonalSection /> : <SecuritySection />}
        </div>
      </div>
    </AppShell>
  )
}

function PersonalSection() {
  const { t, locale } = useT()
  const user = useSessionStore((s) => s.user)
  const updateProfile = useUpdateProfile()
  const updateLocale = useUpdateLocale()
  const [showSaved, setShowSaved] = useState(false)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
    },
  })
  const [firstName, lastName, phone] = form.watch(FIELDS)

  /** Sends only what differs from the session's copy; an invalid form shows its errors and sends nothing. */
  async function flush() {
    const saved = useSessionStore.getState().user
    const values = form.getValues()
    const changed: Partial<ProfileValues> = {}
    for (const key of FIELDS) {
      const value = values[key].trim()
      if (value !== (saved?.[key] ?? "")) changed[key] = value
    }
    if (Object.keys(changed).length === 0) return
    if (!(await form.trigger())) return
    updateProfile.mutate(changed)
  }

  // The latest flush, read by the debounce timer and the blur handler.
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    const timer = setTimeout(() => void flushRef.current(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [firstName, lastName, phone])

  useEffect(() => {
    if (!updateProfile.isSuccess) return
    setShowSaved(true)
    const timer = setTimeout(() => setShowSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [updateProfile.isSuccess, updateProfile.submittedAt])

  const errors = form.formState.errors

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{t("profile.personalInfo")}</h2>
        <div role="status" aria-live="polite" className="text-sm">
          {updateProfile.isPending ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> {t("profile.saving")}
            </span>
          ) : updateProfile.isError ? (
            <span className="flex items-center gap-2 text-destructive">
              {t("profile.saveError")}
              <button type="button" className="font-medium underline" onClick={() => void flush()}>
                {t("profile.retry")}
              </button>
            </span>
          ) : showSaved ? (
            <span className="flex items-center gap-1.5 font-medium text-green-600 animate-in fade-in">
              <CheckCircle size={14} /> {t("profile.saved")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={t("profile.avatar")}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold text-primary-foreground">
                {firstName[0]}
                {lastName[0]}
              </span>
            )}
          </div>
          <NotImplemented className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border bg-card opacity-50 shadow">
            <Camera size={12} className="text-muted-foreground" />
            <span className="sr-only">{t("profile.changePhoto")}</span>
          </NotImplemented>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {firstName} {lastName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void flush()
        }}
        onBlur={() => void flush()}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label={t("auth.register.firstName")}
            error={errors.firstName?.message}
            {...form.register("firstName")}
          />
          <FormField
            label={t("auth.register.lastName")}
            error={errors.lastName?.message}
            {...form.register("lastName")}
          />
        </div>
        <FormField
          label={t("common.email")}
          type="email"
          value={user?.email ?? ""}
          disabled
          readOnly
          hint={t("profile.emailHint")}
        />
        <Controller
          control={form.control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              label={t("auth.register.phone")}
              placeholder="099 123 456"
              error={errors.phone?.message}
              {...field}
            />
          )}
        />
      </form>

      {/* Not part of the debounced form: a language change saves at once. */}
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="language">{t("profile.language")}</Label>
        <select
          id="language"
          value={locale}
          onChange={(e) => {
            if (isLocale(e.target.value)) updateLocale.mutate(e.target.value)
          }}
          className="h-auto w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:text-sm"
        >
          <option value="es">{t("profile.language.es")}</option>
          <option value="en">{t("profile.language.en")}</option>
        </select>
        <div role="status" aria-live="polite" className="text-sm">
          {updateLocale.isPending ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> {t("profile.saving")}
            </span>
          ) : updateLocale.isError ? (
            <span role="alert" className="text-destructive">
              {t("profile.languageSaveError")}
            </span>
          ) : updateLocale.isSuccess ? (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle size={14} /> {t("profile.saved")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SecuritySection() {
  const { t } = useT()
  const changePassword = useChangePassword()
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  const form = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { current: "", next: "", repeat: "" },
  })
  const errors = form.formState.errors

  function onSubmit(values: ProfilePasswordValues) {
    setDone(false)
    setFailed(false)
    changePassword.mutate(
      { currentPassword: values.current, newPassword: values.next },
      {
        onSuccess: () => {
          form.reset({ current: "", next: "", repeat: "" })
          setDone(true)
        },
        onError: (error) => {
          // 400 covers a wrong current password and a new one equal to it.
          if (error instanceof ApiError && error.status === 400) {
            form.setError("current", { message: t("profile.passwordWrong") })
          } else setFailed(true)
        },
      },
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-foreground">{t("profile.changePassword")}</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label={t("profile.currentPassword")}
          type="password"
          autoComplete="current-password"
          placeholder={t("common.passwordMask")}
          error={errors.current?.message}
          {...form.register("current")}
        />
        <FormField
          label={t("profile.newPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.change.placeholder")}
          error={errors.next?.message}
          {...form.register("next")}
        />
        <FormField
          label={t("profile.repeatNewPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("common.passwordMask")}
          error={errors.repeat?.message}
          {...form.register("repeat")}
        />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" loading={changePassword.isPending}>
            {t("profile.changePassword")}
          </Button>
          {done && (
            <span
              role="status"
              className="flex items-center gap-1.5 text-sm font-medium text-green-600"
            >
              <CheckCircle size={14} /> {t("profile.passwordUpdated")}
            </span>
          )}
          {failed && (
            <span role="alert" className="text-sm text-destructive">
              {t("profile.passwordSaveError")}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
