import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import NotImplemented from "@/components/common/NotImplemented"
import { useSessionStore } from "@/stores/sessionStore"
import { useT } from "@/hooks/useT"
import { isLocale } from "@/lib/i18n"
import { useLocaleStore } from "@/stores/localeStore"
import { Label } from "@/components/ui/label"
import {
  profilePasswordSchema,
  profileSchema,
  type ProfilePasswordValues,
  type ProfileValues,
} from "@/lib/schemas"
import { Camera, Save, Lock, CheckCircle, Construction } from "lucide-react"

export default function ProfilePage() {
  const { t, locale } = useT()
  const setLocale = useLocaleStore((state) => state.setLocale)
  const { user, updateUser } = useSessionStore()

  const [profileSaved, setProfileSaved] = useState(false)
  const [passSaved, setPassSaved] = useState(false)
  const avatarPreview = user?.avatarUrl ?? null

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  })

  const passwordForm = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { current: "", next: "", repeat: "" },
  })

  // Watched so the avatar initials and header line track what is typed.
  const firstName = profileForm.watch("firstName")
  const lastName = profileForm.watch("lastName")
  const email = profileForm.watch("email")

  function handleProfileSave(values: ProfileValues) {
    updateUser(values)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  function handlePasswordSave() {
    setPassSaved(true)
    passwordForm.reset({ current: "", next: "", repeat: "" })
    setTimeout(() => setPassSaved(false), 2500)
  }

  return (
    <AppShell>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <div className="flex flex-col gap-6 max-w-lg">
        {/* Profile section */}
        <div className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {t("profile.personalInfo")}
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={t("profile.avatar")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary-foreground text-xl font-semibold">
                    {firstName[0]}
                    {lastName[0]}
                  </span>
                )}
              </div>
              <NotImplemented className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-card border shadow flex items-center justify-center opacity-50">
                <Camera size={12} className="text-muted-foreground" />
                <span className="sr-only">{t("profile.changePhoto")}</span>
              </NotImplemented>
            </div>
            <div>
              <p className="font-medium text-foreground">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit(handleProfileSave)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label={t("auth.register.firstName")}
                error={profileForm.formState.errors.firstName?.message}
                {...profileForm.register("firstName")}
              />
              <FormField
                label={t("auth.register.lastName")}
                error={profileForm.formState.errors.lastName?.message}
                {...profileForm.register("lastName")}
              />
            </div>
            <FormField
              label={t("common.email")}
              type="email"
              error={profileForm.formState.errors.email?.message}
              {...profileForm.register("email")}
            />
            <FormField
              label={t("auth.register.phone")}
              type="tel"
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register("phone")}
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <NotImplemented>
                <Button type="submit" disabled icon={<Save size={14} />}>
                  {t("profile.saveChanges")}
                  <Construction size={14} />
                </Button>
              </NotImplemented>
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={14} /> {t("profile.saved")}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Password section */}
        <div className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t("profile.changePassword")}</h2>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSave)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              label={t("profile.currentPassword")}
              type="password"
              placeholder={t("common.passwordMask")}
              error={passwordForm.formState.errors.current?.message}
              {...passwordForm.register("current")}
            />
            <FormField
              label={t("profile.newPassword")}
              type="password"
              placeholder={t("auth.change.placeholder")}
              error={passwordForm.formState.errors.next?.message}
              {...passwordForm.register("next")}
            />
            <FormField
              label={t("profile.repeatNewPassword")}
              type="password"
              placeholder={t("common.passwordMask")}
              error={passwordForm.formState.errors.repeat?.message}
              {...passwordForm.register("repeat")}
            />
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <NotImplemented>
                <Button type="submit" variant="secondary" disabled>
                  {t("profile.changePassword")}
                  <Construction size={14} />
                </Button>
              </NotImplemented>
              {passSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={14} /> {t("profile.passwordUpdated")}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Language section */}
        <div className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">{t("profile.language")}</Label>
            {/* TODO(T06): PATCH /auth/me { locale } */}
            <select
              id="language"
              value={locale}
              onChange={(e) => {
                if (isLocale(e.target.value)) setLocale(e.target.value)
              }}
              className="h-auto w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base sm:text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <option value="es">{t("profile.language.es")}</option>
              <option value="en">{t("profile.language.en")}</option>
            </select>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
