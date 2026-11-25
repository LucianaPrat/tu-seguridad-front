import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Modal from "./Modal"
import Button from "./Button"
import FormField from "./FormField"
import PhoneField from "./PhoneField"
import { CameraChecklist, MenuChecklist, RoleSelect } from "./AccessFields"
import { Label } from "@/components/ui/label"
import { useCreateMember } from "@/hooks/useMembers"
import type { CreateMemberPayload } from "@/api/members"
import { ApiError } from "@/lib/http"
import { DEFAULT_MENU_ACCESS, MENU_KEYS, type MenuKey } from "@/lib/permissions"
import { addMemberSchema, type AddMemberValues, type SpaceRole } from "@/lib/schemas"
import { Check, UserPlus } from "lucide-react"
import { useT } from "@/hooks/useT"

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
}

const EMPTY: AddMemberValues = { email: "", firstName: "", lastName: "", phone: "", password: "" }

/** Backend messages (409 already member / pending invitation, 400) win over generic copy. */
export default function AddMemberModal({ open, onClose }: AddMemberModalProps) {
  const { t, locale } = useT()
  const [role, setRole] = useState<SpaceRole>("collaborator")
  const [menuAccess, setMenuAccess] = useState<MenuKey[]>(DEFAULT_MENU_ACCESS.collaborator)
  const [cameraIds, setCameraIds] = useState<string[]>([])
  const [added, setAdded] = useState(false)
  const create = useCreateMember()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: EMPTY,
  })

  function changeRole(next: SpaceRole) {
    setRole(next)
    setMenuAccess(DEFAULT_MENU_ACCESS[next])
  }

  async function onSubmit(values: AddMemberValues) {
    const payload: CreateMemberPayload =
      role === "admin"
        ? { ...values, role, locale }
        : {
            ...values,
            role,
            menuAccess,
            locale,
            ...(role === "guest" ? { cameraIds } : {}),
          }
    try {
      await create.mutateAsync(payload)
      setAdded(true)
    } catch {
      // Rendered from `create.error` below; swallowed so `isSubmitting` releases.
    }
  }

  function handleClose() {
    setAdded(false)
    create.reset()
    reset(EMPTY)
    setRole("collaborator")
    setMenuAccess(DEFAULT_MENU_ACCESS.collaborator)
    setCameraIds([])
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("members.add.title")}>
      {added ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-foreground">{t("members.add.done")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("members.add.doneHint")}</p>
          <Button variant="secondary" className="mt-4" onClick={handleClose}>
            {t("common.close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">{t("members.add.intro")}</p>
          {create.error && (
            <p role="alert" className="text-sm text-red-600">
              {create.error instanceof ApiError ? create.error.message : t("members.add.error")}
            </p>
          )}
          <FormField
            label={t("common.email")}
            type="email"
            placeholder={t("members.invite.emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <p className="-mt-2 text-xs text-muted-foreground">{t("members.add.hint")}</p>
          <FormField
            label={t("auth.register.firstName")}
            placeholder={t("auth.register.firstNamePlaceholder")}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <FormField
            label={t("auth.register.lastName")}
            placeholder={t("auth.register.lastNamePlaceholder")}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <Controller
            control={control}
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
          <FormField
            label={t("common.password")}
            type="password"
            placeholder={t("auth.register.passwordPlaceholder")}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-member-role">{t("members.col.role")}</Label>
            <RoleSelect id="add-member-role" value={role} onChange={changeRole} />
          </div>
          <MenuChecklist
            value={role === "admin" ? [...MENU_KEYS] : menuAccess}
            onChange={setMenuAccess}
            disabled={role === "admin"}
          />
          {role === "guest" && <CameraChecklist value={cameraIds} onChange={setCameraIds} />}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting} icon={<UserPlus size={14} />}>
              {t("members.add.submit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
