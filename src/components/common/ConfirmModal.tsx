import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import Modal from "./Modal"
import Button from "./Button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  requireAcknowledge?: boolean
  acknowledgeLabel?: string
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  requireAcknowledge = false,
  acknowledgeLabel = "Entiendo las consecuencias",
}: ConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  function handleConfirm() {
    onConfirm()
    setAcknowledged(false)
  }

  function handleClose() {
    setAcknowledged(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={requireAcknowledge && !acknowledged}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm text-secondary-foreground">{message}</p>
          {requireAcknowledge && (
            <div className="mt-3 flex items-start gap-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acknowledge" className="text-sm font-normal text-secondary-foreground">
                {acknowledgeLabel}
              </Label>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
