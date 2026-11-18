import { type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: "sm" | "md" | "lg"
}

const WIDTHS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
}

/**
 * Radix-backed modal. Escape handling, focus trap, scroll lock and portalling
 * come from shadcn/ui Dialog — this wrapper only keeps the app's prop shape
 * and the sectioned header/body/footer layout.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "md",
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className={cn("gap-0 rounded-2xl bg-card p-0", WIDTHS[width])}
      >
        <DialogHeader className="border-b px-4 sm:px-6 py-4">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-4 sm:px-6 py-5">{children}</div>
        {footer && <DialogFooter className="border-t px-4 sm:px-6 py-4">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
