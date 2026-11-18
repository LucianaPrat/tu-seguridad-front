import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Button from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Mic, Send, Square } from "lucide-react"
import { askAssistant, synthesizeSpeech, transcribeAudio } from "@/api/assistant"
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder"
import { ApiError } from "@/lib/http"
import { useSessionStore } from "@/stores/sessionStore"

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  /** Object URL of the spoken reply. Only voice turns carry one. */
  audioUrl?: string
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

const VOICE_DISABLED_REPLY = "La respuesta por voz todavía no está disponible en esta instalación."

const EMPTY_TRANSCRIPT_REPLY = "No se entendió nada en el audio. Probá grabar de nuevo."

const TRANSCRIBE_RETRYABLE_REPLY = "No pudimos procesar el audio. Probá de nuevo en unos segundos."

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

function isRetryable(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 502 || error.status === 504 || error.status === 0)
  )
}

export default function HelpChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  /*
   * Voice is off upstream until an operator flips ASSISTANT_VOICE_ENABLED, and
   * the first 409 is the whole probe — no capabilities endpoint, no build-time
   * flag, no re-try for the rest of the session.
   */
  const [voiceDisabled, setVoiceDisabled] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const audioUrlsRef = useRef<string[]>([])
  const navigate = useNavigate()

  const { status: recorderStatus, start, stop } = useVoiceRecorder(handleClip)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  useEffect(() => {
    if (recorderStatus !== "recording") {
      setElapsed(0)
      return
    }
    const id = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(id)
  }, [recorderStatus])

  // Every spoken reply holds a blob alive until it is revoked; the page can
  // collect a dozen of them in one conversation.
  useEffect(() => {
    const urls = audioUrlsRef.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function appendAssistant(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text }])
  }

  /** Expired token, no refresh interceptor: drop the half-dead session. */
  function isExpiredSession(error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 401) return false
    useSessionStore.getState().logout()
    navigate("/login")
    return true
  }

  /**
   * One conversation path for both input modes — a transcript is text that
   * lands in the same `content` a typed question would. `voice` only decides
   * whether the reply is also spoken.
   */
  async function ask(text: string, voice: boolean) {
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
    setIsTyping(true)

    try {
      const { reply } = await askAssistant(conversation)
      const replyId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: replyId, role: "assistant", text: reply }])
      if (voice) await speak(replyId, reply)
    } catch (error) {
      if (isExpiredSession(error)) return
      appendAssistant(errorReply(error))
    } finally {
      setIsTyping(false)
    }
  }

  /**
   * Eager TTS: the audio is fetched the moment a voice turn's reply lands, so
   * play is instant. A failure here never removes the reply — a dead player
   * must not eat an answer the operator can already read.
   */
  async function speak(replyId: string, reply: string) {
    try {
      const url = URL.createObjectURL(await synthesizeSpeech(reply))
      audioUrlsRef.current.push(url)
      setMessages((prev) =>
        prev.map((message) => (message.id === replyId ? { ...message, audioUrl: url } : message)),
      )
    } catch (error) {
      if (isExpiredSession(error)) return
      if (error instanceof ApiError && error.status === 409) {
        setVoiceDisabled(true)
        appendAssistant(VOICE_DISABLED_REPLY)
      }
    }
  }

  /** Stop of a recording, manual or at the 60s cap. */
  async function handleClip(blob: Blob) {
    setIsTyping(true)
    try {
      const transcript = (await transcribeAudio(blob)).trim()
      if (!transcript) {
        appendAssistant(EMPTY_TRANSCRIPT_REPLY)
        return
      }
      await ask(transcript, true)
    } catch (error) {
      if (isExpiredSession(error)) return
      if (error instanceof ApiError && error.status === 409) {
        setVoiceDisabled(true)
        appendAssistant(VOICE_DISABLED_REPLY)
        return
      }
      appendAssistant(isRetryable(error) ? TRANSCRIBE_RETRYABLE_REPLY : GENERIC_ERROR_REPLY)
    } finally {
      setIsTyping(false)
    }
  }

  async function handleMic() {
    if (recorderStatus === "recording") {
      stop()
      return
    }
    const failure = await start()
    if (failure) appendAssistant(failure)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isTyping) return

    setInput("")
    await ask(text, false)
  }

  const isRecording = recorderStatus === "recording"

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
              {message.audioUrl && (
                <audio
                  controls
                  preload="metadata"
                  src={message.audioUrl}
                  className="mt-2 w-full"
                  aria-label="Respuesta en audio"
                />
              )}
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
            placeholder={isRecording ? `Grabando… ${elapsed}s` : "Escribí tu pregunta…"}
            aria-label="Mensaje"
            className="flex-1"
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isTyping || isRecording}
          />
          {!voiceDisabled && (
            <Button
              type="button"
              variant={isRecording ? "danger" : "secondary"}
              icon={isRecording ? <Square size={16} /> : <Mic size={16} />}
              className="shrink-0"
              onClick={handleMic}
              disabled={isTyping}
            >
              <span className="sr-only">{isRecording ? "Detener grabación" : "Grabar audio"}</span>
            </Button>
          )}
          <Button
            type="submit"
            icon={<Send size={16} />}
            className="shrink-0"
            disabled={isTyping || isRecording}
          >
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </div>
    </AppShell>
  )
}
