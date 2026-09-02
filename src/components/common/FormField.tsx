import { type ComponentProps, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps extends ComponentProps<"input"> {
  label: string
  error?: string
  hint?: string
  rightElement?: ReactNode
}

/**
 * Labelled input over shadcn/ui Input + Label. Props spread straight onto the
 * input, so `{...register("field")}` from react-hook-form works as-is — pass
 * the matching `errors.field?.message` as `error`.
 */
export default function FormField({
  label,
  error,
  hint,
  rightElement,
  id,
  className,
  ...props
}: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-")
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        <Input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn("h-auto bg-card py-2.5", rightElement && "pr-10", className)}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 p-2">{rightElement}</div>
        )}
      </div>
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
