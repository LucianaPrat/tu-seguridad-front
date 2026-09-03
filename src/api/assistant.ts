import { request } from "@/lib/http"
import { assistantChatResponseSchema } from "@/lib/schemas"
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
