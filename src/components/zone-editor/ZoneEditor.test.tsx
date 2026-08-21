import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ZoneEditor from "@/components/zone-editor/ZoneEditor"
import { rectPoints } from "@/lib/zones"

/**
 * The editor turns pixels into percent of frame, so the tests need a frame with
 * a size. jsdom has no layout, so it is stubbed: 200 x 100 makes every
 * expected percentage a round number.
 */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 100,
    width: 200,
    height: 100,
    toJSON: () => ({}),
  })
})

function renderEditor() {
  const onChange = vi.fn()
  render(
    <ZoneEditor imageUrl="blob:frame" zones={[]} onChange={onChange} defaultAlertType="intruso" />,
  )
  return { onChange, frame: screen.getByAltText("Captura de la cámara").parentElement! }
}

async function drag(
  user: ReturnType<typeof userEvent.setup>,
  frame: HTMLElement,
  path: [number, number][],
) {
  const [start, ...rest] = path
  await user.pointer([
    { keys: "[MouseLeft>]", target: frame, coords: { clientX: start[0], clientY: start[1] } },
    ...rest.map(([clientX, clientY]) => ({ target: frame, coords: { clientX, clientY } })),
    { keys: "[/MouseLeft]", target: frame },
  ])
}

describe("ZoneEditor", () => {
  it("keeps the traced path as the zone outline with the free-hand tool", async () => {
    const user = userEvent.setup()
    const { onChange, frame } = renderEditor()

    await drag(user, frame, [
      [20, 10],
      [120, 10],
      [120, 60],
    ])

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0][0]).toMatchObject({
      points: [
        { x: 10, y: 10 },
        { x: 60, y: 10 },
        { x: 60, y: 60 },
      ],
      alertType: "intruso",
    })
  })

  it("closes the drag into a four-corner box with the rectangle tool", async () => {
    const user = userEvent.setup()
    const { onChange, frame } = renderEditor()

    await user.click(screen.getByRole("button", { name: "Rectángulo" }))
    await drag(user, frame, [
      [20, 10],
      [70, 30],
      [120, 60],
    ])

    expect(onChange).toHaveBeenCalledTimes(1)
    // Only the anchor and the last corner matter: the moves in between do not
    // bend a rectangle.
    expect(onChange.mock.calls[0][0][0].points).toEqual(rectPoints(10, 10, 50, 50))
  })

  /**
   * `user.pointer` awaits a flush per step, which no browser does. A fast trace
   * lands several moves in one task, so the whole path has to survive without a
   * render in between.
   */
  it("keeps every sample of a drag that never flushes between moves", async () => {
    const { onChange, frame } = renderEditor()

    const dispatch = (type: string, clientX: number, clientY: number) =>
      frame.dispatchEvent(
        new MouseEvent(type, { bubbles: true, clientX, clientY }) as unknown as PointerEvent,
      )

    // Every move in one task, the way a browser delivers a fast trace. The
    // release is its own task there, so it is its own act here.
    await act(async () => {
      dispatch("pointerdown", 20, 10)
      for (let i = 1; i <= 20; i++) dispatch("pointermove", 20 + i * 5, 10 + i * 4)
    })
    await act(async () => {
      dispatch("pointerup", 120, 90)
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0][0].points).toHaveLength(21)
  })

  it("ignores a click that drew nothing", async () => {
    const user = userEvent.setup()
    const { onChange, frame } = renderEditor()

    await drag(user, frame, [
      [20, 10],
      [21, 11],
    ])

    expect(onChange).not.toHaveBeenCalled()
  })
})
