import { beforeEach, describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HelpChatPage from "./HelpChatPage"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

describe("HelpChatPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token" })
  })

  it("renders the seeded assistant greeting", () => {
    renderWithProviders(<HelpChatPage />)

    expect(screen.getByText(/Soy tu asistente de ayuda/)).toBeInTheDocument()
  })

  it("shows a sent message and the placeholder assistant reply that follows", async () => {
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "¿Cómo configuro una zona?")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(screen.getByText("¿Cómo configuro una zona?")).toBeInTheDocument()
    expect(
      await screen.findByText(/Todavía no estoy conectado/, {}, { timeout: 2000 }),
    ).toBeInTheDocument()
  })

  it("appends nothing when the input is empty or only whitespace", async () => {
    renderWithProviders(<HelpChatPage />)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Enviar" }))
    await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "   ")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    // Only the seeded greeting stays — nothing else was appended, and no
    // reply timer was ever started.
    expect(screen.getByText(/Soy tu asistente de ayuda/)).toBeInTheDocument()
    expect(screen.queryByText(/Todavía no estoy conectado/)).not.toBeInTheDocument()
  })
})
