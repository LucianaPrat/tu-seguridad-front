import { useId } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useCameras } from "@/hooks/useCameras"
import { useT } from "@/hooks/useT"
import { MENU_KEYS, MENU_LABELS, ROLE_LABELS, type MenuKey } from "@/lib/permissions"
import type { SpaceRole } from "@/lib/schemas"

/** Adds the item when missing, removes it when present. */
function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]
}

export function RoleSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: SpaceRole
  onChange: (role: SpaceRole) => void
  disabled?: boolean
}) {
  const { t } = useT()

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as SpaceRole)}
      className="h-auto w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base sm:text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
    >
      {(Object.entries(ROLE_LABELS) as [SpaceRole, (typeof ROLE_LABELS)[SpaceRole]][]).map(
        ([role, label]) => (
          <option key={role} value={role}>
            {t(label)}
          </option>
        ),
      )}
    </select>
  )
}

export function MenuChecklist({
  value,
  onChange,
  disabled,
}: {
  value: MenuKey[]
  onChange: (value: MenuKey[]) => void
  disabled?: boolean
}) {
  const { t } = useT()
  const id = useId()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{t("members.edit.menu")}</legend>
      {MENU_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            id={`${id}-${key}`}
            checked={value.includes(key)}
            disabled={disabled}
            onCheckedChange={() => onChange(toggle(value, key))}
          />
          <Label htmlFor={`${id}-${key}`} className="font-normal">
            {t(MENU_LABELS[key])}
          </Label>
        </div>
      ))}
      {disabled && (
        <p className="text-xs text-muted-foreground">{t("members.edit.menuAdminHint")}</p>
      )}
    </fieldset>
  )
}

/** Calls useCameras itself, so GET /cameras only fires while this is mounted. */
export function CameraChecklist({
  value,
  onChange,
}: {
  value: string[]
  onChange: (value: string[]) => void
}) {
  const { t } = useT()
  const id = useId()
  const cameras = useCameras()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{t("members.edit.cameras")}</legend>
      {cameras.isPending ? (
        <p className="text-sm text-muted-foreground">{t("cameras.dashboard.loading")}</p>
      ) : !cameras.data?.length ? (
        <p className="text-sm text-muted-foreground">{t("members.edit.noCameras")}</p>
      ) : (
        cameras.data.map((camera) => (
          <div key={camera.id} className="flex items-center gap-2">
            <Checkbox
              id={`${id}-${camera.id}`}
              checked={value.includes(camera.id)}
              onCheckedChange={() => onChange(toggle(value, camera.id))}
            />
            <Label htmlFor={`${id}-${camera.id}`} className="font-normal">
              {camera.name}
            </Label>
          </div>
        ))
      )}
    </fieldset>
  )
}
