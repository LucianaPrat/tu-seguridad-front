import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HelpChatPage from "./HelpChatPage"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"
import { askAssistant } from "@/api/assistant"
import { ApiError } from "@/lib/http"

vi.mock("@/api/assistant", () => ({ askAssistant: vi.fn() }))

const askAssistantMock = vi.mocked(askAssistant)

describe("HelpChatPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token" })
    vi.clearAllMocks()
  })

  it("renders the seeded assistant greeting", () => {
    renderWithProviders(<HelpChatPage />)

    expect(screen.getByText(/Soy tu asistente de ayuda/)).toBeInTheDocument()
  })

  it("shows a sent message and the real assistant reply that follows", async () => {
    askAssistantMock.mockResolvedValue({
      reply: "Andá a Monitoreo y dibujá la zona.",
      model: "test-model",
    })
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "¿Cómo configuro una zona?")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(screen.getByText("¿Cómo configuro una zona?")).toBeInTheDocument()
    expect(await screen.findByText("Andá a Monitoreo y dibujá la zona.")).toBeInTheDocument()
  })

  it("sends the mapped conversation without the greeting", async () => {
    askAssistantMock.mockResolvedValue({ reply: "Listo.", model: "test-model" })
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "¿Cómo configuro una zona?")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    await screen.findByText("Listo.")

    expect(askAssistantMock).toHaveBeenCalledWith([
      { role: "user", content: "¿Cómo configuro una zona?" },
    ])
  })

  it("shows the not-enabled copy on a 409", async () => {
    askAssistantMock.mockRejectedValue(new ApiError(409, "CONFLICT", "Assistant disabled"))
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "¿Cómo configuro una zona?")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByText(/todavía no está habilitado/)).toBeInTheDocument()
    expect(screen.queryByText(/Algo salió mal/)).not.toBeInTheDocument()
  })

  it("appends nothing when the input is empty or only whitespace", async () => {
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Enviar" }))
    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "   ")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    // Only the seeded greeting stays — nothing else was appended, and the API
    // was never called.
    expect(screen.getByText(/Soy tu asistente de ayuda/)).toBeInTheDocument()
    expect(askAssistantMock).not.toHaveBeenCalled()
  })
})
