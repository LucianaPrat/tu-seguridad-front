import { request } from "@/lib/http"

export interface DvrConnectionProbe {
  url: string
  username: string
  password: string
}

/*
 * Connectivity probe. The backend stores nothing on this route — not even
 * lastTestAt — so the only thing that matters is whether it resolves. The
 * response body (`{channelCount}`) is unused, hence unparsed.
 */
export async function testConnection(probe: DvrConnectionProbe): Promise<void> {
  await request<unknown>("/dvr/connection-test", { method: "POST", body: probe })
}
