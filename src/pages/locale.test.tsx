import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoginPage from "@/pages/auth/LoginPage"
import ProfilePage from "@/pages/app/ProfilePage"
import { useLocaleStore } from "@/stores/localeStore"
import { useSessionStore } from "@/stores/sessionStore"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"

describe("locale", () => {
  it("renders the login page in English", () => {
    useLocaleStore.setState({ locale: "en" })
    renderWithProviders(<LoginPage />, { route: "/login" })

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByText("Iniciar sesión")).not.toBeInTheDocument()
  })

  it("switches the profile page from Spanish to English with the language select", async () => {
    useSessionStore.setState({
      authStatus: "ready",
      accessToken: "t",
      isLoggedIn: true,
      user: meResponse({ id: 7 }),
    })
    renderWithProviders(<ProfilePage />, { route: "/profile" })

    expect(screen.getByRole("heading", { name: "Información personal" })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText("Idioma / Language"), "en")

    expect(screen.getByRole("heading", { name: "Personal information" })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("en")
    expect(localStorage.getItem("locale")).toBe("en")
  })
})
