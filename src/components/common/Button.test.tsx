import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Button from "./Button"

describe("Button", () => {
  it("defaults to the primary variant, which is shadcn's default", () => {
    render(<Button>Ingresar</Button>)
    expect(screen.getByRole("button", { name: "Ingresar" })).toHaveAttribute("data-variant", "default")
  })

  it.each([
    ["primary", "default"],
    ["secondary", "secondary"],
    ["ghost", "ghost"],
    ["danger", "destructive"],
  ] as const)("maps variant %s onto shadcn %s", (appVariant, shadcnVariant) => {
    render(<Button variant={appVariant}>Acción</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", shadcnVariant)
  })

  it.each([
    ["sm", "sm"],
    ["md", "default"],
    ["lg", "lg"],
  ] as const)("maps size %s onto shadcn %s", (appSize, shadcnSize) => {
    render(<Button size={appSize}>Acción</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-size", shadcnSize)
  })

  it("disables itself while loading and hides the icon", () => {
    render(
      <Button loading icon={<span data-testid="icon" />}>
        Guardar
      </Button>,
    )

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled()
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument()
  })

  it("renders the icon when idle", () => {
    render(<Button icon={<span data-testid="icon" />}>Guardar</Button>)
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })

  it("does not fire onClick while loading", async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Guardar</Button>)

    await userEvent.click(screen.getByRole("button"), { pointerEventsCheck: 0 })

    expect(onClick).not.toHaveBeenCalled()
  })

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Guardar</Button>)

    await userEvent.click(screen.getByRole("button"))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
