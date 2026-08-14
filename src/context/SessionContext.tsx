import { createContext, useContext, useState, type ReactNode } from "react"
import type { Member } from "@/data/mockData"
import { MEMBERS } from "@/data/mockData"

interface User extends Member {
  spaceName: string
}

interface SessionContextValue {
  isLoggedIn: boolean
  isDVRInit: boolean
  user: User | null
  login: (email: string) => void
  logout: () => void
  initDVR: (spaceName: string) => void
  updateUser: (data: Partial<User>) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

const MOCK_USER: User = {
  ...MEMBERS[0],
  spaceName: "Mi Espacio Seguro",
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isDVRInit, setIsDVRInit] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  function login(_email: string) {
    setIsLoggedIn(true)
    setUser(MOCK_USER)
  }

  function logout() {
    setIsLoggedIn(false)
    setIsDVRInit(false)
    setUser(null)
  }

  function initDVR(spaceName: string) {
    setIsDVRInit(true)
    setUser((u) => (u ? { ...u, spaceName } : u))
  }

  function updateUser(data: Partial<User>) {
    setUser((u) => (u ? { ...u, ...data } : u))
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, isDVRInit, user, login, logout, initDVR, updateUser }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
