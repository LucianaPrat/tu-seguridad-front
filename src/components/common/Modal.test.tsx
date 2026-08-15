import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Modal from "./Modal"

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Invitar miembro">
        contenido
      </Modal>,
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders title, body and footer when open", () => {
    render(
      <Modal open onClose={() => {}} title="Invitar miembro" footer={<button>Cancelar</button>}>
        contenido
      </Modal>,
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Invitar miembro")).toBeInTheDocument()
    expect(screen.getByText("contenido")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
  })

  it("omits the footer region when no footer is given", () => {
    render(
      <Modal open onClose={() => {}} title="Sin footer">
        contenido
      </Modal>,
    )
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument()
  })

  // Escape used to need a hand-rolled keydown listener; Radix supplies it now.
  it("closes on Escape", async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Invitar miembro">
        contenido
      </Modal>,
    )

    await userEvent.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalled()
  })

  it("closes from the built-in close button", async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Invitar miembro">
        contenido
      </Modal>,
    )

    await userEvent.click(screen.getByRole("button", { name: /close/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it("labels the dialog with its title", () => {
    render(
      <Modal open onClose={() => {}} title="Invitar miembro">
        contenido
      </Modal>,
    )
    expect(screen.getByRole("dialog", { name: "Invitar miembro" })).toBeInTheDocument()
  })
})
