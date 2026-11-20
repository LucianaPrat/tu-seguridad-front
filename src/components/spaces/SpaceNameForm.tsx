import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Button from "@/components/common/Button"
import FormField from "@/components/common/FormField"
import { useCreateSpace, useRenameSpace } from "@/hooks/useSpaces"
import { useT } from "@/hooks/useT"
import { ApiError } from "@/lib/http"
import { spaceNameSchema, type SpaceNameValues } from "@/lib/schemas"
import { useSessionStore } from "@/stores/sessionStore"

/** Used by the switcher's modal (create / rename) and by /spaces/start (create). */
export default function SpaceNameForm({
  mode,
  onDone,
}: {
  mode: "create" | "rename"
  onDone?: () => void
}) {
  const { t } = useT()
  const currentName = useSessionStore((state) => state.user?.currentSpace?.name ?? "")
  const create = useCreateSpace()
  const rename = useRenameSpace()
  const mutation = mode === "create" ? create : rename
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SpaceNameValues>({
    resolver: zodResolver(spaceNameSchema),
    defaultValues: { name: mode === "rename" ? currentName : "" },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(({ name }) => mutation.mutate(name, { onSuccess: onDone }))}
    >
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : t("spaces.saveFailed")}
        </p>
      )}
      <FormField
        label={t("dvr.spaceName")}
        placeholder={t("dvr.spaceNamePlaceholder")}
        error={errors.name?.message}
        {...register("name")}
      />
      <Button type="submit" loading={mutation.isPending}>
        {t(mode === "create" ? "spaces.create" : "common.save")}
      </Button>
    </form>
  )
}
