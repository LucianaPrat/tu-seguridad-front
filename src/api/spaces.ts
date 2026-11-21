import { request } from "@/lib/http"
import { accessTokenSchema } from "@/lib/schemas"

/** The caller becomes admin and the session moves into the new space. */
export async function createSpace(name: string): Promise<string> {
  const data = await request<unknown>("/spaces", { method: "POST", body: { name } })
  return accessTokenSchema.parse(data).accessToken
}

/** Admin only. The answer is ignored: the caller re-reads /auth/me. */
export async function renameSpace(name: string): Promise<void> {
  await request<unknown>("/spaces/current", { method: "PATCH", body: { name } })
}
