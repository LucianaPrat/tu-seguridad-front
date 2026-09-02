import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSessionStore } from "@/stores/sessionStore"
import { useLogin } from "@/hooks/useAuth"
import { ApiError } from "@/lib/http"
import { loginSchema, type LoginValues } from "@/lib/schemas"
import { Mail } from "lucide-react"

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Email o contraseña incorrectos"
    if (error.status === 0) return "No pudimos conectar con el servidor. Revisá tu conexión."
  }
  return "Ocurrió un error. Intentá de nuevo."
}

// Face-Auth icon
function FaceAuthIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 9h.01M15 9h.01M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M9 14s.5 1 3 1 3-1 3-1" />
    </svg>
  )
}

export default function LoginPage() {
  const { login } = useSessionStore()
  const navigate = useNavigate()
  const { mutateAsync: submitLogin } = useLogin()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    try {
      await submitLogin(values)
      navigate("/")
    } catch (error) {
      setError("root", { message: loginErrorMessage(error) })
    }
  }

  function handleFaceAuth() {
    login("face@auth.com")
    navigate("/")
  }

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresá a tu panel de seguridad">
      {/* ── Primary form: email + password ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* Server-side failures: wrong credentials, dead backend. */}
        {errors.root && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
          >
            {errors.root.message}
          </p>
        )}
        <FormField
          label="Email"
          type="email"
          placeholder="nombre@ejemplo.com"
          error={errors.email?.message}
          {...register("email")}
        />
        {/* Own layout: recovery link shares the label row, so this field uses
            the shadcn primitives directly instead of FormField. */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              to="/auth/recover"
              className="text-xs text-primary hover:underline inline-flex items-center py-2"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-auto bg-card py-2.5"
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full mt-1">
          Ingresar
        </Button>
      </form>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 my-5">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground font-medium">o</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* ── Alternative buttons ── */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/auth/magic-link")}
          icon={<Mail size={15} className="text-muted-foreground" />}
          className="w-full"
        >
          Continuar con Magic Link
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleFaceAuth}
          icon={<FaceAuthIcon />}
          className="w-full"
        >
          Continuar con Face-Auth
        </Button>
      </div>

      {/* ── Register link ── */}
      <p className="text-center text-sm text-muted-foreground mt-5">
        ¿No tenés cuenta?{" "}
        <Link
          to="/register"
          className="text-primary font-medium hover:underline inline-flex items-center py-2"
        >
          Registrarse
        </Link>
      </p>
    </AuthCard>
  )
}
