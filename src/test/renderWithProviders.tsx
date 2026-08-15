import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"

/*
 * Anything reaching for TanStack Query needs a provider, and every test needs
 * its own client or cached results leak between cases. Retries are off so a
 * deliberate failure fails once instead of after a backoff.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(ui: ReactNode, { route = "/" }: { route?: string } = {}) {
  const queryClient = createTestQueryClient()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}
