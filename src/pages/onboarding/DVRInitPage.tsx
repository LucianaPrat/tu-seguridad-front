import { useNavigate } from "react-router-dom"
import { useSessionStore } from "@/stores/sessionStore"
import { useConfigureDvr } from "@/hooks/useDvr"
import { useRenameSpace } from "@/hooks/useSpaces"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import { ApiError } from "@/lib/http"
import LogoMark from "@/components/common/LogoMark"
import { useT } from "@/hooks/useT"
import { useLogout } from "@/hooks/useAuth"
import Button from "@/components/common/Button"
import type { TranslationKey } from "@/lib/i18n"

/*
 * Three different failures, three different next steps. PUT /dvr is admin-only;
 * the gate now sends only admins here, but a 403 can still come back (role
 * changed mid-session), and a plain "check the DVR fields" would park them in a
 * form they can never submit. The
 * upstream codes mean the opposite of bad data: the fields were fine, the
 * recorder did not answer.
 */
function configureErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.status === 403) return "dvr.init.adminOnly"
    if (error.code === "UPSTREAM_ERROR" || error.code === "UPSTREAM_TIMEOUT")
      return "dvr.init.noResponse"
  }
  return "dvr.init.saveFailed"
}

export default function DVRInitPage() {
  const { t } = useT()
  const rename = useRenameSpace()
  const currentName = useSessionStore((s) => s.user?.currentSpace?.name ?? "")
  const configure = useConfigureDvr()
  const navigate = useNavigate()
  const logout = useLogout()

  function handleSubmit(values: DVRFormValues) {
    configure.mutate(
      {
        url: values.dvrUrl,
        username: values.dvrUser,
        password: values.dvrPassword,
        timezone: values.timezone,
      },
      {
        onSuccess: () => {
          // Only admins reach this wizard, and PATCH /spaces/current is admin-only.
          // Fire-and-forget: a failed rename leaves the old name, nothing else.
          if (values.spaceName !== currentName) rename.mutate(values.spaceName)
          navigate("/")
        },
      },
    )
  }

  return (
    <div className="min-h-dvh bg-[#f4f7f6] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0d4f47] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <LogoMark />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("dvr.init.title")}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t("dvr.init.subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          {/* The backend tests the recorder before storing it, so a failure here
              means nothing was saved and the operator can retry as is. */}
          {configure.isError && (
            <p
              role="alert"
              className="mb-4 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
            >
              {t(configureErrorKey(configure.error))}
            </p>
          )}
          <DVRForm
            defaultValues={{ spaceName: currentName }}
            onSubmit={handleSubmit}
            submitLabel={t("dvr.init.submit")}
            showTestConnection
            loading={configure.isPending}
          />
        </div>
        {/* The gate keeps a DVR-less admin here; logout is the only way out. */}
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" loading={logout.isPending} onClick={() => logout.mutate()}>
            {t("nav.logout")}
          </Button>
        </div>
      </div>
    </div>
  )
}
