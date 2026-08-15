import { request } from "@/lib/http"
import { accessTokenSchema, meSchema } from "@/lib/schemas"
import type { LoginValues, MeResponse } from "@/lib/schemas"

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
