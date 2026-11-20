import { useNavigate } from "react-router-dom"
import { useSessionStore } from "@/stores/sessionStore"
import { useConfigureDvr } from "@/hooks/useDvr"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import { ApiError } from "@/lib/http"
import LogoMark from "@/components/common/LogoMark"
import { useT } from "@/hooks/useT"
import type { TranslationKey } from "@/lib/i18n"

/*
 * Three different failures, three different next steps. PUT /dvr is admin-only,
 * and the gate routes every member of an unconfigured space here — a plain
 * "check the DVR fields" parks a non-admin in a form they can never submit. The
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
  const { updateUser } = useSessionStore()
  const configure = useConfigureDvr()
  const navigate = useNavigate()

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
          // spaceName has no backend column yet, so it stays a display field
          // in the store. PUT /dvr rejects it as an unknown key.
          updateUser({ spaceName: values.spaceName })
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
            onSubmit={handleSubmit}
            submitLabel={t("dvr.init.submit")}
            showTestConnection
            loading={configure.isPending}
          />
        </div>
      </div>
    </div>
  )
}
