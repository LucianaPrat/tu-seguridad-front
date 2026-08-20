import { describe, expect, it } from "vitest"
import userEvent from "@testing-library/user-event"
import { screen, waitFor } from "@testing-library/react"
import DVRInitPage from "./DVRInitPage"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

const STORED_DVR = {
  body: {
    id: "dvr-1",
    url: "http://192.168.1.250",
    username: "admin",
    timezone: "America/Argentina/Buenos_Aires",
    cameraCount: 4,
  },
}

async function fillWizard() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Nombre del espacio"), "Mi casa")
  await user.type(screen.getByLabelText("URL del DVR"), "http://192.168.1.250")
  await user.type(screen.getByLabelText("Usuario DVR"), "admin")
  await user.type(screen.getByLabelText("Contraseña DVR"), "secret")
  await user.click(screen.getByRole("combobox"))
  await user.click(await screen.findByRole("option", { name: /Buenos_Aires/ }))
  await user.click(screen.getByRole("button", { name: "Conectar y continuar" }))
  return user
}

describe("DVRInitPage", () => {
  /*
   * The backend runs forbidNonWhitelisted, so spaceName in the payload is a
   * 400. Exact-match the body: it is the only thing stopping a later edit from
   * putting the display field back on the wire.
   */
  it("puts exactly the four whitelisted keys, spaceName not among them", async () => {
    const fetchMock = mockFetchSequence([STORED_DVR])
    renderWithProviders(<DVRInitPage />)

    await fillWizard()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain("/dvr")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(init.body)).toEqual({
      url: "http://192.168.1.250",
      username: "admin",
      password: "secret",
      timezone: "America/Argentina/Buenos_Aires",
    })
  })

  it("tells a non-admin to ask an admin instead of re-checking the fields", async () => {
    mockFetchSequence([
      { status: 403, body: { statusCode: 403, code: "FORBIDDEN", message: "Admin only" } },
    ])
    renderWithProviders(<DVRInitPage />)

    await fillWizard()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pedile a un admin del espacio que configure el DVR.",
    )
  })

  it("says the recorder did not answer when the backend reports upstream", async () => {
    mockFetchSequence([
      { status: 502, body: { statusCode: 502, code: "UPSTREAM_ERROR", message: "no answer" } },
    ])
    renderWithProviders(<DVRInitPage />)

    await fillWizard()

    expect(await screen.findByRole("alert")).toHaveTextContent("El DVR no respondió")
  })
})
