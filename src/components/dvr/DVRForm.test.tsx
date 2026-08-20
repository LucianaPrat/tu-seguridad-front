import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { screen } from "@testing-library/react"
import DVRForm from "@/components/dvr/DVRForm"
import { renderWithProviders } from "@/test/renderWithProviders"
import { mockFetchSequence } from "@/test/mockFetch"

async function fillProbeFields() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("URL del DVR"), "http://192.168.1.250")
  await user.type(screen.getByLabelText("Usuario DVR"), "admin")
  await user.type(screen.getByLabelText("Contraseña DVR"), "secret")
  return user
}

describe("DVRForm test connection", () => {
  it("posts the credentials and reports success", async () => {
    const fetchMock = mockFetchSequence([{ body: { channelCount: 4 } }])
    renderWithProviders(<DVRForm onSubmit={vi.fn()} />)

    const user = await fillProbeFields()
    await user.click(screen.getByRole("button", { name: "Probar conexión" }))

    expect(await screen.findByText("Conexión exitosa")).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain("/dvr/connection-test")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      url: "http://192.168.1.250",
      username: "admin",
      password: "secret",
    })
  })

  it("reports failure when the recorder refuses", async () => {
    mockFetchSequence([
      { status: 502, body: { statusCode: 502, code: "UPSTREAM_ERROR", message: "nope" } },
    ])
    renderWithProviders(<DVRForm onSubmit={vi.fn()} />)

    const user = await fillProbeFields()
    await user.click(screen.getByRole("button", { name: "Probar conexión" }))

    expect(await screen.findByText("No se pudo conectar")).toBeInTheDocument()
  })

  it("does not call the API with empty credentials", async () => {
    const fetchMock = mockFetchSequence([])
    renderWithProviders(<DVRForm onSubmit={vi.fn()} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Probar conexión" }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
