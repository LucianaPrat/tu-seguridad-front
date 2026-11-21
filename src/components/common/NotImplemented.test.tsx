import { beforeEach, describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import NotImplemented from "./NotImplemented"
import { currentSpace, meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

describe("NotImplemented", () => {
  beforeEach(() => useSessionStore.setState({ user: null }))

  it("renders for admin and without a session", () => {
    useSessionStore.setState({ user: meResponse() })
    const { unmount } = renderWithProviders(<NotImplemented>x</NotImplemented>)
    expect(screen.getByText("x")).toBeInTheDocument()
    unmount()
    useSessionStore.setState({ user: null })
    renderWithProviders(<NotImplemented>y</NotImplemented>)
    expect(screen.getByText("y")).toBeInTheDocument()
  })

  it("renders nothing for a collaborator", () => {
    useSessionStore.setState({
      user: meResponse({ currentSpace: currentSpace({ role: "collaborator" }) }),
    })
    renderWithProviders(<NotImplemented>x</NotImplemented>)
    expect(screen.queryByText("x")).toBeNull()
  })
})
