import { API_BASE_URL, request, requestBlob } from "@/lib/http"
import { assistantChatResponseSchema, assistantTranscriptionResponseSchema } from "@/lib/schemas"
import type { AssistantChatResponse } from "@/lib/schemas"

/**
 * The in-app help assistant. Any member, no admin gate. The product context is
 * the system message and the backend writes it, so only `user` and `assistant`
 * roles travel — a `system` role is a 400. Caps the backend enforces: at most
 * 20 messages, oldest first, each at most 2000 characters.
 */
export async function askAssistant(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<AssistantChatResponse> {
  return assistantChatResponseSchema.parse(
    await request<unknown>("/assistant/chat", { method: "POST", body: { messages } }),
  )
}

/**
 * Speech to text. Multipart under field `file`, capped backend-side at 2 MB —
 * over it the route answers 400, not 413. An empty `text` means the clip had
 * nothing to transcribe, which the caller renders rather than forwarding.
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const body = new FormData()
  // Safari records mp4, everyone else webm; ffmpeg reads either, but the
  // filename has to say which one.
  body.append("file", blob, `clip.${blob.type.includes("mp4") ? "mp4" : "webm"}`)

  const { text } = assistantTranscriptionResponseSchema.parse(
    await request<unknown>("/assistant/transcribe", { method: "POST", body }),
  )
  return text
}

/**
 * Text to speech, answering audio/mpeg bytes. Upstream caps `text` at 4096
 * characters — above the chat route's own 2000, so a reply always fits.
 *
 * `requestBlob` resolves its path against the origin because snapshot paths
 * arrive with the `/api/v1` prefix already baked in; this one does not, so it
 * is spelled out.
 */
export async function synthesizeSpeech(text: string): Promise<Blob> {
  return requestBlob(`${API_BASE_URL}/assistant/speak`, { method: "POST", body: { text } })
}
