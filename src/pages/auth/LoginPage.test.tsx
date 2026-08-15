import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "./LoginPage"
import { useSessionStore } from "@/stores/sessionStore"

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSessionStore.setState({ isLoggedIn: false, isDVRInit: false, user: null })
})

/*
 * Covers the react-hook-form + Zod wiring end to end: the resolver messages
 * from src/lib/schemas.ts have to surface through the FormField `error` prop.
 */
describe("LoginPage", () => {
  it("reports both field errors on an empty submit", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument()
    expect(screen.getByText("Ingresá tu contraseña")).toBeInTheDocument()
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })

  it("rejects a malformed email but accepts the password", async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText("Email"), "not-an-email")
    await userEvent.type(screen.getByLabelText("Contraseña"), "hunter2")
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument()
    expect(screen.queryByText("Ingresá tu contraseña")).not.toBeInTheDocument()
  })

  it("marks the email input invalid for assistive tech", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    })
  })

  it("logs the session in once the form validates", async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText("Email"), "luciana@example.com")
    await userEvent.type(screen.getByLabelText("Contraseña"), "hunter2")
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    await waitFor(
      () => {
        expect(useSessionStore.getState().isLoggedIn).toBe(true)
      },
      { timeout: 3000 },
    )
    expect(useSessionStore.getState().user?.email).toBeDefined()
  })

  it("Face-Auth skips validation and logs straight in", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: /Face-Auth/ }))

    expect(useSessionStore.getState().isLoggedIn).toBe(true)
  })
})
