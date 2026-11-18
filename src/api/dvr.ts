import { ApiError, request } from "@/lib/http"
import { dvrResponseSchema } from "@/lib/schemas"
import type { DvrResponse } from "@/lib/schemas"

export interface DvrConnectionProbe {
  url: string
  username: string
  password: string
}

/** PUT /dvr takes the probe plus a time zone — and nothing else: the backend
 * runs `forbidNonWhitelisted`, so an extra key (spaceName) is a 400. */
export interface ConfigureDvrPayload extends DvrConnectionProbe {
  timezone: string
}

/*
 * Connectivity probe. The backend stores nothing on this route — not even
 * lastTestAt — so the only thing that matters is whether it resolves. The
 * response body (`{channelCount}`) is unused, hence unparsed.
 */
export async function testConnection(probe: DvrConnectionProbe): Promise<void> {
  await request<unknown>("/dvr/connection-test", { method: "POST", body: probe })
}

/**
 * The space's recorder, or null when it has never been configured. A 404 is
 * the documented normal state of a new space, not a failure — every other
 * error propagates so a dead backend cannot read as "needs onboarding".
 */
export async function getDvr(): Promise<DvrResponse | null> {
  try {
    return dvrResponseSchema.parse(await request<unknown>("/dvr"))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Initializes or re-points the recorder. Admin only; runs discovery server-side. */
export async function configureDvr(payload: ConfigureDvrPayload): Promise<DvrResponse> {
  return dvrResponseSchema.parse(await request<unknown>("/dvr", { method: "PUT", body: payload }))
}
