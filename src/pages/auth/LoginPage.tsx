import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { useSession } from "@/context/SessionContext"
import { Mail } from "lucide-react"

// Face-Auth icon
function FaceAuthIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 9h.01M15 9h.01M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M9 14s.5 1 3 1 3-1 3-1" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passError, setPassError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useSession()
  const navigate = useNavigate()

  function validateEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    let valid = true
    if (!validateEmail(email)) { setEmailError("Ingresá un email válido"); valid = false } else setEmailError("")
    if (!password) { setPassError("Ingresá tu contraseña"); valid = false } else setPassError("")
    if (!valid) return
    setLoading(true)
    setTimeout(() => {
      login(email)
      navigate("/onboarding/dvr")
    }, 800)
  }

  function handleFaceAuth() {
    login("face@auth.com")
    navigate("/onboarding/dvr")
  }

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresá a tu panel de seguridad">
      {/* ── Primary form: email + password ── */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <FormField
          label="Email"
          type="email"
          placeholder="nombre@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <Link to="/auth/recover" className="text-xs text-[#1a6b61] hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 focus:border-[#1a6b61] placeholder:text-gray-400 ${
              passError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          />
          {passError && <p className="text-xs text-red-600 mt-1">{passError}</p>}
        </div>

        <Button type="submit" loading={loading} className="w-full mt-1">
          Ingresar
        </Button>
      </form>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400 font-medium">o</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* ── Alternative buttons ── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate("/auth/magic-link")}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Mail size={15} className="text-gray-500" />
          Continuar con Magic Link
        </button>

        <button
          type="button"
          onClick={handleFaceAuth}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <FaceAuthIcon />
          Continuar con Face-Auth
        </button>
      </div>

      {/* ── Register link ── */}
      <p className="text-center text-sm text-gray-500 mt-5">
        ¿No tenés cuenta?{" "}
        <Link to="/register" className="text-[#1a6b61] font-medium hover:underline">
          Registrarse
        </Link>
      </p>
    </AuthCard>
  )
}
