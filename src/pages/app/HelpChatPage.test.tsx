import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HelpChatPage from "./HelpChatPage"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"
import { askAssistant, synthesizeSpeech, transcribeAudio } from "@/api/assistant"
import { ApiError } from "@/lib/http"

vi.mock("@/api/assistant", () => ({
  askAssistant: vi.fn(),
  transcribeAudio: vi.fn(),
  synthesizeSpeech: vi.fn(),
}))

const askAssistantMock = vi.mocked(askAssistant)
const transcribeAudioMock = vi.mocked(transcribeAudio)
const synthesizeSpeechMock = vi.mocked(synthesizeSpeech)

/** Mic click, stop click — the setup stub's recorder answers a clip on stop. */
async function record(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Grabar audio" }))
  await user.click(await screen.findByRole("button", { name: "Detener grabación" }))
}

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

  it("sends the transcript of a recording as the question", async () => {
    transcribeAudioMock.mockResolvedValue("¿Cómo agrego una cámara?")
    askAssistantMock.mockResolvedValue({ reply: "Andá a Cámaras.", model: "test-model" })
    synthesizeSpeechMock.mockResolvedValue(new Blob(["mp3"], { type: "audio/mpeg" }))
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await record(user)

    expect(await screen.findByText("¿Cómo agrego una cámara?")).toBeInTheDocument()
    expect(askAssistantMock).toHaveBeenCalledWith([
      { role: "user", content: "¿Cómo agrego una cámara?" },
    ])
  })

  it("attaches a player to the spoken reply of a voice turn", async () => {
    transcribeAudioMock.mockResolvedValue("¿Cómo agrego una cámara?")
    askAssistantMock.mockResolvedValue({ reply: "Andá a Cámaras.", model: "test-model" })
    synthesizeSpeechMock.mockResolvedValue(new Blob(["mp3"], { type: "audio/mpeg" }))
    const { container } = renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await record(user)

    await screen.findByText("Andá a Cámaras.")
    await waitFor(() => expect(container.querySelector("audio")).toBeInTheDocument())
  })

  it("keeps the text reply when speech synthesis fails", async () => {
    transcribeAudioMock.mockResolvedValue("¿Cómo agrego una cámara?")
    askAssistantMock.mockResolvedValue({ reply: "Andá a Cámaras.", model: "test-model" })
    synthesizeSpeechMock.mockRejectedValue(new ApiError(502, "UPSTREAM_ERROR", "Gateway down"))
    const { container } = renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await record(user)

    expect(await screen.findByText("Andá a Cámaras.")).toBeInTheDocument()
    expect(container.querySelector("audio")).not.toBeInTheDocument()
  })

  it("renders the empty-transcript copy and asks nothing", async () => {
    transcribeAudioMock.mockResolvedValue("   ")
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await record(user)

    expect(await screen.findByText(/No se entendió nada/)).toBeInTheDocument()
    expect(askAssistantMock).not.toHaveBeenCalled()
  })

  it("hides the mic for the session when voice is off upstream", async () => {
    transcribeAudioMock.mockRejectedValue(new ApiError(409, "CONFLICT", "Voice disabled"))
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await record(user)

    expect(
      await screen.findByText(/La respuesta por voz todavía no está disponible/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Grabar audio" })).not.toBeInTheDocument()
  })
})
