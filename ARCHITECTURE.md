# Architecture

Not workflow (see [`CONTRIBUTING.md`](CONTRIBUTING.md)), not ops gotchas (see
[`docs/BEST_PRACTICES.md`](docs/BEST_PRACTICES.md)), not agent conventions (see
[`AGENTS.md`](AGENTS.md)). This file states how the frontend is put together
and which layer owns what.

Product scope lives in [`ui.md`](ui.md).

## What this is

Single-page React app for security monitoring. One operator watches many DVR
cameras, configures per-camera alert zones, and receives alerts over
communication channels.

Client-only. No SEO, no SSR, no server rendering of any kind. Vite builds a
static bundle; a backend serves REST and WebSocket separately.

## Layers

```
main.tsx                 mount only
  App.tsx                providers + route table
    pages/               one file per route, owns page composition
      components/layout/ AppShell, Sidebar, TopBar — app chrome
      components/<domain>/ camera, dvr, zone-editor, auth
        components/common/  app wrappers with app prop vocabulary
          components/ui/    shadcn/ui primitives (Radix)
    stores/              Zustand — global client state
    hooks/               TanStack Query hooks
      api/               typed API calls
        lib/http.ts      fetch client — bearer, cookie, error envelope
    lib/                 cn, queryClient, http, Zod schemas
    data/                fixtures, standing in for the API
```

Dependency direction points down. Rules:

- `components/ui/` imports nothing from the app except `lib/utils`. CLI-owned.
- `components/common/` imports `components/ui/` and `lib/`. Never a page, never
  a store.
- `components/<domain>/` may import `common/`, `lib/`, `data/`.
- `pages/` compose everything and are the only layer that reads route params.
- `stores/` import nothing from `components/` or `pages/`.

Violating the last two is how a codebase this size turns into a cycle.

## Routing

React Router 7, `BrowserRouter`, route table in `src/App.tsx`.

Three access tiers, enforced by wrapper components rather than a route config
field:

| Tier | Guard | Behaviour |
|---|---|---|
| Public | none | `/login`, `/register`, `/auth/*` |
| Authenticated | `RequireAuth` | redirects to `/login` when logged out |
| DVR ready | `RequireDVR` | redirects to `/login`, then `/onboarding/dvr` |

`RequireDVR` gates every app route. Product rule: a user cannot reach the
dashboard before initializing a DVR, so `isDVRInit` is a hard gate, not a
banner.

Above all of them sits `AuthGate`, outside `BrowserRouter`: no route renders
while `authStatus` is `"unknown"`, so a guard never runs against a session that
has not been restored yet.

`/login` also redirects outward when already authenticated, so the back button
cannot park a logged-in user on the login screen.

Unmatched paths redirect to `/`, which re-enters the guard chain.

## State ownership

Three homes. Picking the wrong one is the main architectural mistake available
here.

**Zustand — `src/stores/`.** Global client state the server does not own.
Today: `sessionStore` with `authStatus`, `accessToken`, `isLoggedIn`,
`isDVRInit`, `user`. Tomorrow: WebSocket connection status, live alert list,
per-camera online flags.

The access token is the one deliberate exception to "no server data in
Zustand" — it is a client credential, not cached server state, and it must be
readable synchronously from `http.ts` on every request.

No provider. `useSessionStore()` without a selector is deliberate — session
state changes rarely, and selector plumbing would be optimization the project
explicitly does not want.

**TanStack Query — `src/lib/queryClient.ts`.** Everything the server owns:
cameras, DVR config, members, channel config, event history. Server data never
gets copied into Zustand; that duplication is what Query exists to avoid.

Defaults: `staleTime` 30s, `retry` 1, `refetchOnWindowFocus` off. Focus
refetching is off on purpose — live traffic arrives over WebSocket, so
refetching on focus would re-pull what the socket already pushed.

**Component state.** Everything else: open/closed modals, which tab is active,
password-visibility toggles, upload previews. Do not lift these.

## Data layer

Built for auth, fixtures for everything else. Pages other than login still
import from `src/data/mockData.ts` directly, with submit handlers `await`ing a
`setTimeout` to imitate latency.

Domain types already live there and are the contract to hold onto:
`Camera`, `SecurityEvent`, `Member`, `ChannelConfig`, `MonitorZone`,
plus `AlertType` (`intruso` | `sospechoso`), `ChannelType` (`llamada` |
`whatsapp` | `email`), `MonitorMode` (`full` | `partial`).

Three layers, top to bottom:

1. `src/lib/http.ts` — the client. Prefixes `VITE_API_BASE_URL` (default
   `http://localhost:3000/api/v1`), attaches `Authorization: Bearer` from
   `sessionStore`, always sends `credentials: "include"` so the refresh cookie
   rides along, and turns the backend envelope into `ApiError {status, code}`.
   Framework errors (404, 429) carry no `code`, so it falls back to
   `UNKNOWN_ERROR`; a failed `fetch` becomes status `0`.
2. `src/api/<resource>.ts` — typed promises, Zod-parsed at the boundary.
   `auth.ts`, `dvr.ts`, `cameras.ts`, `members.ts` and `invitations.ts` exist;
   the rest are not written.
3. `src/hooks/` — TanStack Query hooks over those. `useAuth.ts` exports
   `useSessionBootstrap`, `useLogin`, `useLogout`. `useDvr.ts` exports
   `useTestDvrConnection`. `useCameras.ts` exports `useCameras`, `useZones`,
   `useSaveCamera`, `useCaptureSnapshot`, `useSnapshotImage`. `useMembers.ts`
   exports `useMembers`; `useInvitations.ts` exports `useCreateInvitation`,
   `usePendingInvitations`, `useAcceptInvitation`.

Cameras are the first screen off fixtures: `/cameras/monitor` reads
`GET /cameras` and `GET /cameras/:id/zones`, and saves with `PUT /cameras/:id`
plus one call per zone — there is no bulk zone route, so `diffZones` splits the
edited list into creates, updates and deletes. Zone rectangles are percent of
frame on both sides, which is why the editor needs no conversion.

Snapshots are the exception to "the page just calls the hook": `GET
/snapshots/:id` answers raw bytes behind the bearer token, so an `<img src>`
gets a 401. `requestBlob` fetches them with the header and `useSnapshotImage`
turns the blob into an object URL, revoked on unmount.

Then swap page imports from `mockData` to the hooks. Types should not move.

Backend contract is at `http://localhost:3000/docs`.

### Auth

JWT, access plus refresh, split by where each can be reached from:

- **Access token** — 15 minutes, held in `sessionStore` in memory. Never
  persisted, so it cannot be read off disk and dies with the tab.
- **Refresh token** — 7 days, an HttpOnly cookie the backend sets on
  `/auth/login` and `/auth/refresh`, scoped to `Path=/api/v1/auth`. JS cannot
  read it, so an XSS cannot exfiltrate the long-lived credential. It never
  appears in a response body.

On boot `AuthGate` runs `useSessionBootstrap`, which trades the cookie for a
fresh access token and loads `/auth/me`. Routes stay unmounted until that
settles — otherwise a reloaded operator flashes the login screen. A 401 there
just means nobody is logged in.

`SameSite=Lax` is enough while the frontend and API share a site; ports are not
part of a site. A production split across registrable domains forces
`SameSite=None; Secure`, which needs a CSRF token on `/auth/refresh`.

Not built: the 401 auto-refresh interceptor. Required before any page consumes
protected endpoints, since the access token expires in 15 minutes.

## Forms

react-hook-form with `zodResolver`, no exceptions. Schemas in
`src/lib/schemas.ts`, one module so validation wording stays consistent.
Messages are user-facing Spanish and render straight from the resolver.

`components/common/FormField` spreads onto the shadcn Input, so
`{...register("field")}` binds with no adapter. Controlled widgets
(`TimezoneCombobox`) go through `Controller`.

Submit handlers are async and `formState.isSubmitting` drives button loading
state. No hand-rolled `loading` booleans.

Forms carry `noValidate` — Zod owns validation, not the browser.

## Styling

Tailwind CSS v4 via `@tailwindcss/vite`. No config file, no PostCSS. Theme
lives in `src/index.css`.

One token system: shadcn semantic names filled with brand values. `--primary`
is brand teal `#1a6b61`, `--background` is page grey `#f4f7f6`, `--ring`
matches primary. That is why shadcn primitives look native without
per-component overrides.

Brand names with no shadcn counterpart — `--color-sidebar`, `--color-online`,
`--color-offline`, `--color-intruso`, `--color-sospechoso` — sit in the same
`@theme inline` block.

A `.dark` block exists and is complete, but nothing toggles it yet. The app
ships light.

Known debt: about 40 `#1a6b61` literals remain in `src/pages/`, from the Figma
export. Semantic classes are preferred for new work.

## Not built yet

Named so nobody assumes they exist:

- **WebSocket event feed.** Planned as a hook owning the socket, writing live
  alerts into a Zustand store. Not started.
- **Video playback.** hls.js if the DVR serves HLS, native WebRTC if it serves
  low-latency. Player mounts only while a camera panel is open — constant
  streaming is explicitly out of scope.
- **Register, magic link, Face-Auth.** Endpoints exist (`POST /auth/register`,
  `POST /auth/magic-link/request|consume`, `POST /auth/password-reset/confirm`)
  but no page calls them: these screens still call `sessionStore.login()`, which
  sets a fixture user and no token. The delivered links also point at paths this
  app does not serve — the mailer sends `/auth/magic` and `/auth/reset-password`,
  the router has `/auth/magic-link` and `/auth/change-password`, and neither
  page reads a `?token=`. Login and the invitation flow are real — see
  [Auth](#auth).
- **401 auto-refresh.** `http.ts` does not retry on 401 yet.
- **Dashboard hover-to-live thumbnails**, per `ui.md`. Static images today.

## Tests

Vitest plus React Testing Library, jsdom environment. `vitest.config.ts` is
standalone from `vite.config.ts` because the Figma Make plugins there — site
config injection, error-overlay replay, kit route — serve a dev server or a
production build and do nothing for tests.

What is covered: the Zustand store's transitions, every Zod schema rule, the
`common/` wrappers' mapping onto shadcn variants, Radix dialog behaviour, and
one end-to-end form path through react-hook-form and Zod on `LoginPage`.

`src/test/setup.ts` stubs what jsdom lacks and Radix needs: pointer capture,
`scrollIntoView`, `matchMedia`, `ResizeObserver`.

## Build

Vite 8. `vite.config.ts` is Figma Make managed — it reads
`.figma/make/site.json` to inject title, description, favicon, Open Graph tags,
analytics and `robots.txt`, and registers three dev-only plugins. Treat that
file as generated; put test config in `vitest.config.ts` instead.

`base` follows `FIGMA_PUBLIC_URL` when set, otherwise `/`.

The bundle trips Vite's 500 kB chunk warning. Left alone deliberately — code
splitting is the sort of optimization this project rules out, and the app is
served over LAN to a handful of operators.
