import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import FormField from "@/components/common/FormField"
import TimezoneCombobox from "@/components/common/TimezoneCombobox"
import Button from "@/components/common/Button"
import { useTestDvrConnection } from "@/hooks/useDvr"
import { dvrSchema, type DVRFormValues } from "@/lib/schemas"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

export type { DVRFormValues }

interface DVRFormProps {
  defaultValues?: Partial<DVRFormValues>
  onSubmit: (values: DVRFormValues) => void
  submitLabel?: string
  showTestConnection?: boolean
  loading?: boolean
}

export default function DVRForm({
  defaultValues,
  onSubmit,
  submitLabel = "Guardar",
  showTestConnection = true,
  loading = false,
}: DVRFormProps) {
  const [showPass, setShowPass] = useState(false)
  const testConnection = useTestDvrConnection()

  const {
    register,
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<DVRFormValues>({
    resolver: zodResolver(dvrSchema),
    defaultValues: {
      spaceName: defaultValues?.spaceName ?? "",
      dvrUrl: defaultValues?.dvrUrl ?? "",
      dvrUser: defaultValues?.dvrUser ?? "",
      dvrPassword: defaultValues?.dvrPassword ?? "",
      timezone: defaultValues?.timezone ?? "",
    },
  })

  /*
   * Validates only the three fields the probe sends: the backend rejects a
   * time zone on this route, and the space name is not its business either.
   *
   * Trimmed here because required() in schemas.ts is z.string().trim(), so
   * handleSubmit saves trimmed values while getValues() returns raw input.
   * Untrimmed, the probe could pass on credentials different from the stored
   * ones — or fail on credentials that would have been saved fine.
   */
  async function handleTest() {
    const valid = await trigger(["dvrUrl", "dvrUser", "dvrPassword"])
    if (!valid) return
    const { dvrUrl, dvrUser, dvrPassword } = getValues()
    testConnection.mutate({
      url: dvrUrl.trim(),
      username: dvrUser.trim(),
      password: dvrPassword.trim(),
    })
  }

  /** A badge must not outlive the values it describes. */
  function resetProbe() {
    if (!testConnection.isIdle) testConnection.reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField
        label="Nombre del espacio"
        placeholder="Ej: Mi casa"
        error={errors.spaceName?.message}
        {...register("spaceName")}
      />
      <FormField
        label="URL del DVR"
        placeholder="http://192.168.1.100:8080"
        error={errors.dvrUrl?.message}
        {...register("dvrUrl", { onChange: resetProbe })}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Usuario DVR"
          placeholder="admin"
          error={errors.dvrUser?.message}
          {...register("dvrUser", { onChange: resetProbe })}
        />
        <FormField
          label="Contraseña DVR"
          type={showPass ? "text" : "password"}
          placeholder="••••••••"
          error={errors.dvrPassword?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          {...register("dvrPassword", { onChange: resetProbe })}
        />
      </div>

      <Controller
        control={control}
        name="timezone"
        render={({ field, fieldState }) => (
          <TimezoneCombobox
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      {showTestConnection && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            loading={testConnection.isPending}
          >
            Probar conexión
          </Button>
          {testConnection.isSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={15} /> Conexión exitosa
            </span>
          )}
          {testConnection.isError && (
            <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
              <XCircle size={15} /> No se pudo conectar
            </span>
          )}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" loading={loading} className="w-full">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
