import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhoneField from "./PhoneField"
import { isValidPhoneNumber } from "libphonenumber-js/min"

function setup() {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState("")
    return (
      <PhoneField
        label="Tel"
        name="phone"
        value={value}
        onChange={(v) => {
          setValue(v)
          onChange(v)
        }}
      />
    )
  }
  render(<Harness />)
  return { onChange, last: () => onChange.mock.lastCall?.[0] as string }
}

describe("PhoneField", () => {
  it.each(["099 05 04 45", "99050445", "099050445", "099 050 445"])(
    "accepts local Uruguayan input %s as E.164",
    async (text) => {
      const { last } = setup()
      await userEvent.type(screen.getByLabelText("Tel"), text)
      expect(last()).toBe("+59899050445")
    },
  )

  it("detects the country from a +598 number", async () => {
    const { last } = setup()
    await userEvent.click(screen.getByRole("combobox", { name: "País" }))
    await userEvent.click(screen.getByText("Argentina"))
    expect(screen.getByRole("combobox", { name: "País" })).toHaveTextContent("+54")
    await userEvent.type(screen.getByLabelText("Tel"), "+598 99 05 04 45")
    expect(screen.getByRole("combobox", { name: "País" })).toHaveTextContent("+598")
    expect(last()).toBe("+59899050445")
  })

  it("makes a Uruguayan number invalid once the country is changed to AR", async () => {
    const { last } = setup()
    await userEvent.type(screen.getByLabelText("Tel"), "099050445")
    await userEvent.click(screen.getByRole("combobox", { name: "País" }))
    await userEvent.click(screen.getByText("Argentina"))
    expect(isValidPhoneNumber(last())).toBe(false)
  })
})
