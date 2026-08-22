import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Modal from "./Modal"
import Button from "./Button"
import FormField from "./FormField"
import { useCreateInvitation } from "@/hooks/useInvitations"
import { ApiError } from "@/lib/http"
import { inviteSchema, type InviteValues } from "@/lib/schemas"
import { Send } from "lucide-react"

interface InviteModalProps {
  open: boolean
  onClose: () => void
}

/** A 409 ("ya pertenece al espacio") is the message worth showing, so the
 * backend's own copy wins over anything generic. */
function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "No pudimos enviar la invitación"
}

export default function InviteModal({ open, onClose }: InviteModalProps) {
  const [sent, setSent] = useState(false)
  const invite = useCreateInvitation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit({ email }: InviteValues) {
    try {
      await invite.mutateAsync(email)
      setSent(true)
    } catch {
      // Rendered from `invite.error` below. Swallowed here only so the promise
      // settles and `isSubmitting` releases the button.
    }
  }

  function handleClose() {
    setSent(false)
    invite.reset()
    reset({ email: "" })
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invitar miembro">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Send size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-foreground">Invitación enviada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Revisá el correo. Si el email está disponible, recibirá el enlace de acceso.
          </p>
          <Button variant="secondary" className="mt-4" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">
            Ingresá el email de la persona que querés invitar al espacio. Le llegará un enlace de
            acceso.
          </p>
          {invite.error && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage(invite.error)}
            </p>
          )}
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} icon={<Send size={14} />}>
              Enviar invitación
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
