import { request } from "@/lib/http"
import { accessTokenSchema, meSchema } from "@/lib/schemas"
import type { Locale } from "@/lib/i18n"
import { useLocaleStore } from "@/stores/localeStore"
import type { LoginValues, MeResponse, RegisterValues } from "@/lib/schemas"

/*
 * Auth endpoints. Login and refresh answer with the access token only — the
 * refresh token arrives as an HttpOnly cookie the browser stores and replays
 * on its own, so none of these functions ever sees it.
 */

export async function login(values: LoginValues): Promise<string> {
  const data = await request<unknown>("/auth/login", {
    method: "POST",
    body: values,
    auth: false,
  })
  return accessTokenSchema.parse(data).accessToken
}

/** What the route takes: the repeated password stays in the browser, the space name is derived. */
export type RegisterPayload = Omit<RegisterValues, "repeatPassword"> & { spaceName: string }

/** Creates the account, its space and an admin membership, and opens a session in one call. */
export async function register(payload: RegisterPayload): Promise<string> {
  const data = await request<unknown>("/auth/register", {
    method: "POST",
    body: { ...payload, locale: useLocaleStore.getState().locale },
    auth: false,
  })
  return accessTokenSchema.parse(data).accessToken
}

/** Moves the session into another space of the caller; the back replaces the refresh cookie too. */
export async function switchSpace(spaceId: string): Promise<string> {
  const data = await request<unknown>("/auth/switch-space", { method: "POST", body: { spaceId } })
  return accessTokenSchema.parse(data).accessToken
}

/** Cookie-driven: there is nothing to pass, the browser carries the token. */
export async function refresh(): Promise<string> {
  const data = await request<unknown>("/auth/refresh", { method: "POST", auth: false })
  return accessTokenSchema.parse(data).accessToken
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST", auth: false })
}

export async function me(): Promise<MeResponse> {
  return meSchema.parse(await request<unknown>("/auth/me"))
}

export async function updateMe(body: { locale: Locale }): Promise<MeResponse> {
  return meSchema.parse(await request<unknown>("/auth/me", { method: "PATCH", body }))
}

/*
 * Fills in what an invitation left open. One of the two routes reachable with
 * an incomplete profile, and it re-issues the session: `profileCompleted` is a
 * token claim, so the old access token would keep answering 403 everywhere.
 */
export async function completeProfile(payload: {
  firstName: string
  lastName: string
  phone: string
  password: string
}): Promise<string> {
  const data = await request<unknown>("/auth/complete-profile", {
    method: "POST",
    body: payload,
  })
  return accessTokenSchema.parse(data).accessToken
}
