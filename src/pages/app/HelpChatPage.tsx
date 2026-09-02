import { useEffect, useRef, useState, type FormEvent } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send } from "lucide-react"

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

const NOT_CONNECTED_REPLY =
  "Todavía no estoy conectado a un asistente real, pero pronto lo voy a estar. ¡Gracias por tu paciencia!"

const REPLY_DELAY = 600

export default function HelpChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }])
    setInput("")
    setIsTyping(true)

    // ponytail: fixed placeholder reply, no real assistant yet — real AI call
    // replaces this timeout once the backend exists.
    timerRef.current = setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: NOT_CONNECTED_REPLY },
      ])
    }, REPLY_DELAY)
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
                  : "self-start bg-card border",
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
          />
          <Button type="submit" icon={<Send size={16} />} className="shrink-0">
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </div>
    </AppShell>
  )
}
