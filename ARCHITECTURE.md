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
    lib/                 cn, queryClient, Zod schemas
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

`/login` also redirects outward when already authenticated, so the back button
cannot park a logged-in user on the login screen.

Unmatched paths redirect to `/`, which re-enters the guard chain.

## State ownership

Three homes. Picking the wrong one is the main architectural mistake available
here.

**Zustand — `src/stores/`.** Global client state the server does not own.
Today: `sessionStore` with `isLoggedIn`, `isDVRInit`, `user`. Tomorrow: JWT
access token, WebSocket connection status, live alert list, per-camera online
flags.

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

Not built. Pages import fixtures from `src/data/mockData.ts` directly, and
submit handlers `await` a `setTimeout` to imitate latency.

Domain types already live there and are the contract to hold onto:
`Camera`, `SecurityEvent`, `Member`, `ChannelConfig`, `MonitorZone`,
plus `AlertType` (`intruso` | `sospechoso`), `ChannelType` (`llamada` |
`whatsapp` | `email`), `MonitorMode` (`full` | `partial`).

When the API lands:

1. Add an HTTP client that attaches the access token and refreshes on 401.
2. Add `src/api/<resource>.ts` returning typed promises.
3. Add query hooks calling those, keyed per resource.
4. Swap page imports from `mockData` to the hooks. Types should not move.

Backend contract is at `http://localhost:3000/docs`. JWT with access plus
refresh token.

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
- **Real auth.** `sessionStore.login()` sets a fixture user. No token, no
  refresh, no API call.
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
