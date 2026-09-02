import { type ReactNode } from "react"
import { Shield } from "lucide-react"

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-dvh bg-[#f4f7f6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0d4f47] flex items-center justify-center mb-3 shadow-lg">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1 text-center">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
