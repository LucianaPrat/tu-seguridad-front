import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Button from "@/components/common/Button"
import FormField from "@/components/common/FormField"
import PhoneField from "@/components/common/PhoneField"
import ConfirmModal from "@/components/common/ConfirmModal"
import { CameraChecklist, MenuChecklist, RoleSelect } from "@/components/common/AccessFields"
import { useRemoveMember, useUpdateMember } from "@/hooks/useMembers"
import { useT } from "@/hooks/useT"
import type { UpdateMemberPayload } from "@/api/members"
import { ApiError } from "@/lib/http"
import { DEFAULT_MENU_ACCESS, MENU_KEYS, type MenuKey } from "@/lib/permissions"
import {
  memberProfileSchema,
  type MemberProfileValues,
  type MemberResponse,
  type SpaceRole,
} from "@/lib/schemas"
import { useSessionStore } from "@/stores/sessionStore"

/** Mounted only while editing, so the state initialisers read `member` directly. */
export default function MemberEditSheet({
  member,
  onClose,
}: {
  member: MemberResponse
  onClose: () => void
}) {
  const { t } = useT()
  const [role, setRole] = useState<SpaceRole>(member.role)
  const [menuAccess, setMenuAccess] = useState<MenuKey[]>(
    member.menuAccess ?? DEFAULT_MENU_ACCESS[member.role],
  )
  const [cameraIds, setCameraIds] = useState<string[]>(member.cameraIds ?? [])
  const [receiveAlerts, setReceiveAlerts] = useState(member.receiveAlerts)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const profileDefaults: MemberProfileValues = {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
  }
  const form = useForm<MemberProfileValues>({
    defaultValues: profileDefaults,
  })
  const { errors } = form.formState
  const locked = !member.profileEditable
  const isSelf = useSessionStore((state) => state.user?.id) === member.id
  const update = useUpdateMember()
  const remove = useRemoveMember()
  const error = update.error ?? remove.error

  function changeRole(next: SpaceRole) {
    setRole(next)
    setMenuAccess(DEFAULT_MENU_ACCESS[next])
  }

  function save() {
    // Only what changed is validated and sent: an old row may hold a legacy phone
    // that must not block an access edit, and a sent email kills the user's sessions.
    const values = form.getValues()
    const parsed = memberProfileSchema.safeParse(values)
    const profile: UpdateMemberPayload = {}
    let invalid = false
    form.clearErrors()
    if (!locked) {
      for (const key of ["firstName", "lastName", "email", "phone"] as const) {
        if (values[key].trim() === profileDefaults[key]) continue
        const issue = parsed.success
          ? undefined
          : parsed.error.issues.find((i) => i.path[0] === key)
        const message = issue?.message ?? (values[key].trim() === "" ? "validation.required" : "")
        if (message) {
          form.setError(key, { message })
          invalid = true
        } else profile[key] = values[key].trim()
      }
    }
    if (invalid) return
    // On your own row the role is unchanged, which the back treats as a no-op.
    const patch: UpdateMemberPayload =
      role === "admin"
        ? { role, receiveAlerts, ...profile }
        : {
            ...profile,
            role,
            menuAccess,
            receiveAlerts,
            ...(role === "guest" ? { cameraIds } : {}),
          }
    update.mutate({ userId: member.id, ...patch }, { onSuccess: onClose })
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent aria-describedby={undefined} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("members.edit.title")}</SheetTitle>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </SheetHeader>
        <div className="px-4 flex flex-col gap-4">
          <form
            id="member-profile"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            className="flex flex-col gap-3"
          >
            <p className="text-sm font-medium">{t("members.edit.personal")}</p>
            {locked && (
              <p className="text-xs text-muted-foreground">{t("members.edit.personalLocked")}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label={t("auth.register.firstName")}
                disabled={locked}
                error={errors.firstName?.message}
                {...form.register("firstName")}
              />
              <FormField
                label={t("auth.register.lastName")}
                disabled={locked}
                error={errors.lastName?.message}
                {...form.register("lastName")}
              />
            </div>
            <FormField
              label={t("common.email")}
              type="email"
              disabled={locked}
              error={errors.email?.message}
              hint={locked ? undefined : t("members.edit.emailHint")}
              {...form.register("email")}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <PhoneField
                  label={t("auth.register.phone")}
                  placeholder="099 123 456"
                  disabled={locked}
                  error={errors.phone?.message}
                  {...field}
                />
              )}
            />
          </form>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-role">{t("members.col.role")}</Label>
            <RoleSelect id="member-role" value={role} onChange={changeRole} disabled={isSelf} />
            {isSelf && (
              <p className="text-xs text-muted-foreground">{t("members.edit.selfRoleHint")}</p>
            )}
          </div>
          <MenuChecklist
            value={role === "admin" ? [...MENU_KEYS] : menuAccess}
            onChange={setMenuAccess}
            disabled={role === "admin"}
          />
          {role === "guest" && <CameraChecklist value={cameraIds} onChange={setCameraIds} />}
          <div className="flex items-center gap-2">
            <Checkbox
              id="member-alerts"
              checked={receiveAlerts}
              onCheckedChange={(checked) => setReceiveAlerts(checked === true)}
            />
            <Label htmlFor="member-alerts" className="font-normal">
              {t("members.edit.alerts")}
            </Label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : t("members.actionError")}
            </p>
          )}
        </div>
        <SheetFooter>
          <Button type="submit" form="member-profile" loading={update.isPending}>
            {t("common.save")}
          </Button>
          {!isSelf && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              {t("members.remove")}
            </Button>
          )}
        </SheetFooter>
        {/* Inside SheetContent so the Radix layers nest. */}
        <ConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t("members.remove.confirmTitle", { email: member.email })}
          message={t("members.remove.confirmMessage")}
          confirmLabel={t("members.remove.confirm")}
          onConfirm={() => {
            setConfirmOpen(false)
            remove.mutate(member.id, { onSuccess: onClose })
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
