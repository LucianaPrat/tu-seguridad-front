import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import Badge from "./Badge"

describe("Badge", () => {
  it.each([
    ["online", "En línea"],
    ["offline", "Desconectada"],
    ["intruso", "Intruso"],
    ["sospechoso", "Sospechoso"],
    ["configured", "Configurada"],
    ["unconfigured", "Sin configurar"],
    ["active", "Activo"],
    ["inactive", "Inactivo"],
  ] as const)("falls back to the Spanish label for %s", (variant, label) => {
    render(<Badge variant={variant} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("prefers an explicit label over the default", () => {
    render(<Badge variant="online" label="Cámara 3" />)
    expect(screen.getByText("Cámara 3")).toBeInTheDocument()
    expect(screen.queryByText("En línea")).not.toBeInTheDocument()
  })

  it("keeps the domain colour instead of the shadcn outline palette", () => {
    render(<Badge variant="intruso" />)
    expect(screen.getByText("Intruso")).toHaveClass("bg-red-100")
  })

  it("appends caller classes", () => {
    render(<Badge variant="active" className="ml-2" />)
    expect(screen.getByText("Activo")).toHaveClass("ml-2")
  })
})
