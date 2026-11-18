import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { Button as ShadcnButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

/** App vocabulary mapped onto shadcn/ui Button variants. */
const VARIANT_MAP = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
} as const

const SIZE_MAP = {
  sm: "sm",
  md: "default",
  lg: "lg",
} as const

/**
 * shadcn sizes top out at 40px; 44px is the phone-tap floor. Applies to this
 * component only — icon controls elsewhere size themselves and clear the 24px
 * of WCAG 2.5.8 on their own.
 */
const SIZE_CLASS = {
  sm: "min-h-9",
  md: "min-h-11",
  lg: "min-h-11",
} as const

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      disabled={disabled || loading}
      className={cn(SIZE_CLASS[size], variant === "secondary" && "border border-input", className)}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </ShadcnButton>
  )
}
