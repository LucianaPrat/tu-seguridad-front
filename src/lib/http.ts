import { useSessionStore } from "@/stores/sessionStore"
import { useLocaleStore } from "@/stores/localeStore"
import { translate, type TranslationKey } from "@/lib/i18n"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1"

// Our own fallbacks only; messages from the API stay as the backend sent them.
const tr = (key: TranslationKey) => translate(useLocaleStore.getState().locale, key)

/**
 * The backend wraps business failures in `{statusCode, code, message}`. Framework
 * errors (404, 429) skip that envelope entirely, so `code` is best-effort.
 * `status` 0 means the request never reached the server.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  /** Attach the bearer access token. Off for the public auth routes. */
  auth?: boolean
}

let inflight: Promise<string | null> | null = null

/*
 * Trades the HttpOnly refresh cookie for a new access token after a 401.
 *
 * Single-flight on purpose: the backend rotates the refresh token and treats a
 * second use of the old one as theft — it revokes every session of the user.
 * Several queries hitting 401 at once must share one refresh, and the Web Lock
 * serialises it across tabs (they share the cookie). `stale` is the token the
 * failed request carried: if the store already holds another one, somebody
 * refreshed in the meantime and that token is reused without calling the back.
 *
 * A failed refresh ends the session; the route guards take it to login.
 */
export function refreshAccessToken(stale: string | null): Promise<string | null> {
  const run = async (): Promise<string | null> => {
    const store = useSessionStore.getState()
    if (store.accessToken && store.accessToken !== stale) return store.accessToken
    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Network blip: keep the session, the next call tries again.
      return null
    }
    try {
      const payload = (await response.json().catch(() => null)) as {
        accessToken?: unknown
      } | null
      if (!response.ok || typeof payload?.accessToken !== "string") throw new Error()
      store.setAccessToken(payload.accessToken)
      return payload.accessToken
    } catch {
      useSessionStore.getState().logout()
      return null
    }
  }

  if (inflight) return inflight
  const locked = (async () =>
    navigator.locks ? await navigator.locks.request("auth-refresh", run) : run())()
  inflight = locked.finally(() => {
    inflight = null
  })
  return inflight
}

/**
 * fetch with the bearer token from the store. A 401 on an authenticated call
 * gets one refresh and one retry; the second answer is final either way.
 */
async function authedFetch(url: string | URL, init: RequestInit, auth: boolean): Promise<Response> {
  const send = (token: string | null) => {
    const headers = { ...(init.headers as Record<string, string>) }
    if (auth && token) headers.Authorization = `Bearer ${token}`
    return fetch(url, { ...init, headers, credentials: "include" })
  }

  const token = useSessionStore.getState().accessToken
  let response: Response
  try {
    response = await send(token)
    if (response.status === 401 && auth && token) {
      const fresh = await refreshAccessToken(token)
      if (fresh) response = await send(fresh)
    }
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", tr("errors.network"))
  }
  return response
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options

  // FormData writes its own Content-Type with the multipart boundary the
  // server parses; setting the header by hand strips that boundary.
  const isFormData = body instanceof FormData

  const headers: Record<string, string> = {}
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json"

  // credentials: "include" carries the HttpOnly refresh cookie. The backend
  // echoes the exact origin rather than "*", which is what makes credentialed
  // CORS legal.
  const response = await authedFetch(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    },
    auth,
  )

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const envelope = payload as { code?: string; message?: string } | null
    throw new ApiError(
      response.status,
      envelope?.code ?? "UNKNOWN_ERROR",
      envelope?.message ?? tr("errors.unexpected"),
    )
  }

  return payload as T
}

/**
 * Snapshot bytes sit behind the same bearer token as the JSON routes, so an
 * `<img src>` cannot fetch them — the browser sends no Authorization header.
 * Callers turn the blob into an object URL. `path` already carries the API
 * prefix (`/api/v1/snapshots/...`), so it resolves against the origin only.
 *
 * `/assistant/speak` answers bytes to a POST, hence the method and body — the
 * bearer header and the credentialed fetch are the part that matters, not the
 * verb.
 */
export async function requestBlob(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<Blob> {
  const { method = "GET", body } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const response = await authedFetch(
    new URL(path, API_BASE_URL),
    { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
    true,
  )

  if (!response.ok) {
    throw new ApiError(response.status, "UNKNOWN_ERROR", tr("errors.fileLoad"))
  }

  return response.blob()
}
