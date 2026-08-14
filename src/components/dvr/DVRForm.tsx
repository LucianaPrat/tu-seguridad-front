import { useState } from "react"
import FormField from "@/components/ui/FormField"
import TimezoneCombobox from "@/components/ui/TimezoneCombobox"
import Button from "@/components/ui/Button"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

export interface DVRFormValues {
  spaceName: string
  dvrUrl: string
  dvrUser: string
  dvrPassword: string
  timezone: string
}

interface DVRFormProps {
  defaultValues?: Partial<DVRFormValues>
  onSubmit: (values: DVRFormValues) => void
  submitLabel?: string
  showTestConnection?: boolean
  loading?: boolean
}

type TestState = "idle" | "loading" | "success" | "error"

export default function DVRForm({
  defaultValues,
  onSubmit,
  submitLabel = "Guardar",
  showTestConnection = true,
  loading = false,
}: DVRFormProps) {
  const [values, setValues] = useState<DVRFormValues>({
    spaceName: defaultValues?.spaceName ?? "",
    dvrUrl: defaultValues?.dvrUrl ?? "",
    dvrUser: defaultValues?.dvrUser ?? "",
    dvrPassword: defaultValues?.dvrPassword ?? "",
    timezone: defaultValues?.timezone ?? "",
  })
  const [errors, setErrors] = useState<Partial<DVRFormValues>>({})
  const [showPass, setShowPass] = useState(false)
  const [testState, setTestState] = useState<TestState>("idle")

  function set(field: keyof DVRFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: "" }))
  }

  function validate() {
    const errs: Partial<DVRFormValues> = {}
    if (!values.spaceName.trim()) errs.spaceName = "Requerido"
    if (!values.dvrUrl.trim()) errs.dvrUrl = "Requerido"
    if (!values.dvrUser.trim()) errs.dvrUser = "Requerido"
    if (!values.dvrPassword.trim()) errs.dvrPassword = "Requerido"
    if (!values.timezone) errs.timezone = "Seleccioná una zona horaria"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(values)
  }

  function handleTest() {
    if (!validate()) return
    setTestState("loading")
    setTimeout(() => {
      setTestState(Math.random() > 0.3 ? "success" : "error")
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField
        label="Nombre del espacio"
        placeholder="Ej: Mi casa"
        value={values.spaceName}
        onChange={(e) => set("spaceName", e.target.value)}
        error={errors.spaceName}
      />
      <FormField
        label="URL del DVR"
        placeholder="http://192.168.1.100:8080"
        value={values.dvrUrl}
        onChange={(e) => set("dvrUrl", e.target.value)}
        error={errors.dvrUrl}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Usuario DVR"
          placeholder="admin"
          value={values.dvrUser}
          onChange={(e) => set("dvrUser", e.target.value)}
          error={errors.dvrUser}
        />
        <FormField
          label="Contraseña DVR"
          type={showPass ? "text" : "password"}
          placeholder="••••••••"
          value={values.dvrPassword}
          onChange={(e) => set("dvrPassword", e.target.value)}
          error={errors.dvrPassword}
          rightElement={
            <button type="button" onClick={() => setShowPass((s) => !s)} className="text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
      </div>

      <div className="relative">
        <TimezoneCombobox
          value={values.timezone}
          onChange={(iana) => set("timezone", iana)}
          error={errors.timezone}
        />
      </div>

      {/* Test connection */}
      {showTestConnection && (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={handleTest} loading={testState === "loading"}>
            Probar conexión
          </Button>
          {testState === "success" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={15} /> Conexión exitosa
            </span>
          )}
          {testState === "error" && (
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
