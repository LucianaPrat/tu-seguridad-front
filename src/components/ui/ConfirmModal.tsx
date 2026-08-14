import { useState } from "react"
import Modal from "./Modal"
import Button from "./Button"
import { AlertTriangle } from "lucide-react"

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
          <p className="text-sm text-gray-700">{message}</p>
          {requireAcknowledge && (
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 accent-[#1a6b61]"
              />
              <span className="text-sm text-gray-700">{acknowledgeLabel}</span>
            </label>
          )}
        </div>
      </div>
    </Modal>
  )
}
