import Button from "@/components/common/Button"
import LogoMark from "@/components/common/LogoMark"
import SpaceNameForm from "@/components/spaces/SpaceNameForm"
import { useLogout } from "@/hooks/useAuth"
import { useT } from "@/hooks/useT"

/*
 * Reached by an account with no space at all. The gate sends the user to /login
 * after logout and to "/" once a space exists.
 */
export default function SpaceStartPage() {
  const { t } = useT()
  const { mutate: logout } = useLogout()

  return (
    <div className="min-h-dvh bg-[#f4f7f6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0d4f47] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <LogoMark />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("spaces.start.title")}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t("spaces.start.subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <SpaceNameForm mode="create" />
        </div>

        {/* F02: my invitations list goes here. */}
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => logout()}>
            {t("nav.logout")}
          </Button>
        </div>
      </div>
    </div>
  )
}
