import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Modal from "./Modal"
import Button from "./Button"
import FormField from "./FormField"
import { CameraChecklist, MenuChecklist, RoleSelect } from "./AccessFields"
import { Label } from "@/components/ui/label"
import { useCreateInvitation } from "@/hooks/useInvitations"
import type { CreateInvitationPayload } from "@/api/invitations"
import { ApiError } from "@/lib/http"
import { isLocale, type Locale } from "@/lib/i18n"
import { DEFAULT_MENU_ACCESS, MENU_KEYS, type MenuKey } from "@/lib/permissions"
import { inviteSchema, type InviteValues, type SpaceRole } from "@/lib/schemas"
import { Send } from "lucide-react"
import { useT } from "@/hooks/useT"

interface InviteModalProps {
  open: boolean
  onClose: () => void
}

/** A 409 ("ya pertenece al espacio") is the message worth showing, so the
 * backend's own copy wins over anything generic. */
export default function InviteModal({ open, onClose }: InviteModalProps) {
  const { t, locale } = useT()
  // Collaborator: the safe middle option.
  const [role, setRole] = useState<SpaceRole>("collaborator")
  const [menuAccess, setMenuAccess] = useState<MenuKey[]>(DEFAULT_MENU_ACCESS.collaborator)
  const [cameraIds, setCameraIds] = useState<string[]>([])
  const [mailLocale, setMailLocale] = useState<Locale>(locale)
  const [sent, setSent] = useState(false)
  const invite = useCreateInvitation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  })

  function changeRole(next: SpaceRole) {
    setRole(next)
    setMenuAccess(DEFAULT_MENU_ACCESS[next])
  }

  async function onSubmit({ email }: InviteValues) {
    const payload: CreateInvitationPayload =
      role === "admin"
        ? { email, role, locale: mailLocale }
        : {
            email,
            role,
            menuAccess,
            locale: mailLocale,
            ...(role === "guest" ? { cameraIds } : {}),
          }
    try {
      await invite.mutateAsync(payload)
      setSent(true)
    } catch {
      // Rendered from `invite.error` below. Swallowed here only so the promise
      // settles and `isSubmitting` releases the button.
    }
  }

  function handleClose() {
    setSent(false)
    invite.reset()
    reset({ email: "" })
    setRole("collaborator")
    setMenuAccess(DEFAULT_MENU_ACCESS.collaborator)
    setCameraIds([])
    setMailLocale(locale)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("members.invite.title")}>
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Send size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-foreground">{t("members.invite.sent")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("members.invite.sentHint")}</p>
          <Button variant="secondary" className="mt-4" onClick={handleClose}>
            {t("common.close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">{t("members.invite.intro")}</p>
          {invite.error && (
            <p role="alert" className="text-sm text-red-600">
              {invite.error instanceof ApiError ? invite.error.message : t("members.invite.error")}
            </p>
          )}
          <FormField
            label={t("common.email")}
            type="email"
            placeholder={t("members.invite.emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">{t("members.col.role")}</Label>
            <RoleSelect id="invite-role" value={role} onChange={changeRole} />
          </div>
          <MenuChecklist
            value={role === "admin" ? [...MENU_KEYS] : menuAccess}
            onChange={setMenuAccess}
            disabled={role === "admin"}
          />
          {role === "guest" && <CameraChecklist value={cameraIds} onChange={setCameraIds} />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-locale">{t("members.invite.language")}</Label>
            <select
              id="invite-locale"
              value={mailLocale}
              onChange={(e) => {
                if (isLocale(e.target.value)) setMailLocale(e.target.value)
              }}
              className="h-auto w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base sm:text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <option value="es">{t("profile.language.es")}</option>
              <option value="en">{t("profile.language.en")}</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting} icon={<Send size={14} />}>
              {t("members.invite.submit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
