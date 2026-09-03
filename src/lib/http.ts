import { useSessionStore } from "@/stores/sessionStore"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1"

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

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options

  // FormData writes its own Content-Type with the multipart boundary the
  // server parses; setting the header by hand strips that boundary.
  const isFormData = body instanceof FormData

  const headers: Record<string, string> = {}
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json"
  if (auth) {
    const { accessToken } = useSessionStore.getState()
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      // Carries the HttpOnly refresh cookie. The backend echoes the exact
      // origin rather than "*", which is what makes credentialed CORS legal.
      credentials: "include",
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "No pudimos conectar con el servidor")
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const envelope = payload as { code?: string; message?: string } | null
    throw new ApiError(
      response.status,
      envelope?.code ?? "UNKNOWN_ERROR",
      envelope?.message ?? "Error inesperado",
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
  const { accessToken } = useSessionStore.getState()

  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await fetch(new URL(path, API_BASE_URL), {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "No pudimos conectar con el servidor")
  }

  if (!response.ok) {
    throw new ApiError(response.status, "UNKNOWN_ERROR", "No pudimos cargar el archivo")
  }

  return response.blob()
}
