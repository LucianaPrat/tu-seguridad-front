import { useMutation } from "@tanstack/react-query"
import * as dvrApi from "@/api/dvr"

/** Probe writes nothing server-side, so there is no cache to invalidate. */
export function useTestDvrConnection() {
  return useMutation({ mutationFn: dvrApi.testConnection })
}
