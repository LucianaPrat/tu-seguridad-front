import { describe, expect, it } from "vitest"
import { DEFAULT_MENU_ACCESS, MENU_KEYS, canEdit, canView, type MenuKey } from "./permissions"
import type { SpaceRole } from "./schemas"
import { currentSpace } from "@/test/fixtures"

const DEFAULTS: Record<SpaceRole, MenuKey[]> = {
  admin: [...MENU_KEYS],
  collaborator: ["home", "monitor", "events", "dvr", "channels"],
  guest: ["home", "monitor"],
}

// [view, edit] per key, in MENU_KEYS order.
const EXPECTED: Record<SpaceRole, Record<MenuKey, [number, number]>> = {
  admin: {
    home: [1, 1],
    monitor: [1, 1],
    events: [1, 1],
    dvr: [1, 1],
    channels: [1, 1],
    members: [1, 1],
  },
  collaborator: {
    home: [1, 1],
    monitor: [1, 1],
    events: [1, 1],
    dvr: [1, 1],
    channels: [1, 1],
    members: [0, 0],
  },
  guest: {
    home: [1, 0],
    monitor: [1, 0],
    events: [0, 0],
    dvr: [0, 0],
    channels: [0, 0],
    members: [0, 0],
  },
}

const CASES = (Object.keys(EXPECTED) as SpaceRole[]).flatMap((role) =>
  MENU_KEYS.map((key) => [role, key] as const),
)

describe("permissions", () => {
  it.each(CASES)("%s / %s matches the back's defaults", (role, key) => {
    const space = currentSpace({ role, menuAccess: DEFAULTS[role] })
    const [view, edit] = EXPECTED[role][key]
    expect(canView(space, key)).toBe(view === 1)
    expect(canEdit(space, key)).toBe(edit === 1)
  })

  it("denies every key without a space", () => {
    for (const key of MENU_KEYS) {
      expect(canView(null, key)).toBe(false)
      expect(canEdit(null, key)).toBe(false)
    }
  })

  it("lets an admin with an empty menuAccess view and edit everything", () => {
    const space = currentSpace({ role: "admin", menuAccess: [] })
    for (const key of MENU_KEYS) {
      expect(canView(space, key)).toBe(true)
      expect(canEdit(space, key)).toBe(true)
    }
  })

  it("lets a guest view a granted section but never edit it", () => {
    const space = currentSpace({ role: "guest", menuAccess: ["dvr"] })
    expect(canView(space, "dvr")).toBe(true)
    expect(canEdit(space, "dvr")).toBe(false)
  })
})

describe("DEFAULT_MENU_ACCESS", () => {
  it("keeps members away from collaborators and guests on home and monitor only", () => {
    expect(DEFAULT_MENU_ACCESS.collaborator).not.toContain("members")
    expect(DEFAULT_MENU_ACCESS.guest).toEqual(["home", "monitor"])
  })
})
