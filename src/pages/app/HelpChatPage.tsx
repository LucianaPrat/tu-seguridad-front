import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send } from "lucide-react"
import { askAssistant } from "@/api/assistant"
import { ApiError } from "@/lib/http"
import { useSessionStore } from "@/stores/sessionStore"

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
}

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  text: "¡Hola! Soy tu asistente de ayuda. Contame qué necesitás — puedo orientarte con cámaras, zonas, alertas o canales de comunicación.",
}

/*
 * Backend caps, mirrored client-side: over either one the route answers 400,
 * which is a bug on this side rather than something to render in the thread.
 */
const MAX_TURNS = 20
const MAX_MESSAGE_LENGTH = 2000

const ASSISTANT_DISABLED_REPLY =
  "El asistente todavía no está habilitado en esta instalación. Pedile a un administrador que lo active."

const RETRYABLE_REPLY = "No pude responder ahora mismo. Probá de nuevo en unos segundos."

const GENERIC_ERROR_REPLY = "Algo salió mal al procesar tu pregunta. Probá de nuevo."

/*
 * A failure answers in the thread, where the question is — a toast would put
 * the answer somewhere the conversation is not. 409 is the honest "not turned
 * on here"; 502/504/network are worth retrying; anything else is a client bug.
 */
function errorReply(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return ASSISTANT_DISABLED_REPLY
    if (error.status === 502 || error.status === 504 || error.status === 0) return RETRYABLE_REPLY
  }
  return GENERIC_ERROR_REPLY
}

export default function HelpChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isTyping) return

    const question: Message = { id: crypto.randomUUID(), role: "user", text }
    /*
     * The greeting is client copy, not something the assistant said — sending
     * it back would spend a turn of the 20-message budget telling the model it
     * already answered a question nobody asked.
     */
    const conversation = [...messages, question]
      .filter((message) => message.id !== GREETING.id)
      .slice(-MAX_TURNS)
      .map((message) => ({ role: message.role, content: message.text }))

    setMessages((prev) => [...prev, question])
    setInput("")
    setIsTyping(true)

    try {
      const { reply } = await askAssistant(conversation)
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: reply }])
    } catch (error) {
      // No refresh interceptor in http.ts: an expired token cannot recover
      // here, so drop the half-dead session the way the layout chrome does.
      if (error instanceof ApiError && error.status === 401) {
        useSessionStore.getState().logout()
        navigate("/login")
        return
      }
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: errorReply(error) },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col min-h-0 lg:h-full">
        <PageHeader
          title="Ayuda"
          subtitle="Preguntá lo que necesites sobre cámaras, zonas, alertas o canales."
        />

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 py-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] min-w-0 break-words rounded-2xl px-4 py-2.5 text-sm",
                message.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-card border whitespace-pre-wrap",
              )}
            >
              {message.text}
            </div>
          ))}
          {isTyping && (
            <div className="self-start max-w-[85%] min-w-0 rounded-2xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              Escribiendo…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Plain form, no react-hook-form + Zod: one free-text field with no
            validation beyond "not empty" — the resolver AGENTS.md mandates for
            forms would be pure ceremony here. */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t pt-3 shrink-0">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribí tu pregunta…"
            aria-label="Mensaje"
            className="flex-1"
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isTyping}
          />
          <Button type="submit" icon={<Send size={16} />} className="shrink-0" disabled={isTyping}>
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </div>
    </AppShell>
  )
}
