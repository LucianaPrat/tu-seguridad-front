import { useState } from "react"
import Modal from "./Modal"
import Button from "./Button"
import FormField from "./FormField"
import { Send } from "lucide-react"

interface InviteModalProps {
  open: boolean
  onClose: () => void
}

export default function InviteModal({ open, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!valid) { setError("Ingresá un email válido"); return }
    setError("")
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1000)
  }

  function handleClose() {
    setEmail("")
    setSent(false)
    setError("")
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invitar miembro">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Send size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">Invitación enviada</p>
          <p className="text-sm text-gray-500 mt-1">
            Revisá el correo. Si el email está disponible, recibirá el enlace de acceso.
          </p>
          <Button variant="secondary" className="mt-4" onClick={handleClose}>Cerrar</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Ingresá el email de la persona que querés invitar al espacio. Le llegará un enlace de acceso.
          </p>
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" loading={loading} icon={<Send size={14} />}>
              Enviar invitación
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
