# tu-seguridad-front

Security monitoring UI. React 19 SPA. Event feed over WebSocket plus on-demand
video from camera DVRs. No SEO, no SSR, no high-performance rendering needs.

Started as a Figma Make export. No longer runs inside Figma Make — treat it as a
normal local Vite project.

## Toolchain

**Node 22 required.** `.mise.toml` pins it. On Node 20 the test run dies with
`webidl.util.markAsUncloneable is not a function` — jsdom 30 pulls undici 8,
which needs a Node 22 API. `engines.node` in `package.json` states the floor.

pnpm is the package manager. `.mise.toml` pins pnpm 10.34.3.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server, `$PORT` or 8443, host 0.0.0.0 |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Serve the built output |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `oxfmt --check src` — format check, not a linter |
| `pnpm test` | Vitest, single run |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm verify` | typecheck, lint, test, build — run before every commit |
| `pnpm format` | oxfmt, writes changes |

No ESLint in this repo. `lint` checks formatting only.

### Formatting

oxfmt, configured in `.oxfmtrc.json`. Options are Prettier-compatible:
`semi: false`, double quotes, `printWidth` 100, trailing commas, 2 spaces.
`src/imports/` is ignored — Figma-exported assets.

Scope is `src` on purpose. `vite.config.ts` is Figma Make managed; formatting it
invites a regeneration conflict.

Pin oxfmt at `^0.63.0` or newer. **0.2.0 silently corrupted TypeScript** — it
dropped the `;` member separator inside single-line type literals, producing
code that would not parse:

```ts
children?: { label: string; to: string }[]   // before
children?: { label: string to: string }[]    // after 0.2.0 — TS1005
```

Fixed upstream. Do not downgrade below 0.63.0.

## Stack

Locked. Do not swap without asking.

- React 19, TypeScript 5.9, Vite 8
- Tailwind CSS v4 via `@tailwindcss/vite` — no config file, no PostCSS
- shadcn/ui on Radix (`radix-ui` unified package) for primitives
- TanStack Query for REST cache
- Zustand for global client state
- React Router 7 for routing
- react-hook-form + Zod for every form
- Vitest + React Testing Library for tests
- lucide-react for icons

**Banned:** Next.js, Redux, Bootstrap, CSS-in-JS, aggressive render
optimization. Reason: no SEO, no SSR, low frontend complexity. Do not add
`useMemo`/`useCallback`/`React.memo` to chase renders unless a measurement
proves a problem.

## Structure

```
src/
  main.tsx              React entry. Mounts App into #root, imports index.css
  App.tsx               QueryClientProvider > AuthGate > BrowserRouter > routes
  index.css             Tailwind entry, theme tokens, base layer
  api/                  Typed API calls, one module per resource. auth, dvr,
                        cameras
  hooks/                TanStack Query hooks over api/. useAuth, useDvr,
                        useCameras
  components/
    ui/                 shadcn/ui primitives — CLI-owned, do not hand-edit
    common/             App wrappers over those primitives
    auth/               AuthCard shell for auth screens
    camera/             CameraCard, CameraCardUnconfigured, CameraGrid
    dvr/                DVRForm
    layout/             AppShell, Sidebar, TopBar
    zone-editor/        ZoneEditor, ZoneList
  pages/
    auth/               Login, Register, PasswordRecovery, PasswordChange, MagicLink
    onboarding/         DVRInitPage
    app/                Dashboard, DVRConfig, CameraMonitor, Events, Members,
                        CommChannels, Profile
  stores/               Zustand stores. sessionStore holds auth + DVR-init state
  lib/                  utils (cn), queryClient, http (REST client), schemas (Zod)
  data/                 mockData, timezones — fixtures for everything but auth
  test/                 setup.ts (jest-dom, RTL cleanup, jsdom stubs),
                        renderWithProviders, mockFetch
  imports/              Figma-exported assets
```

`.figma/make/` is tracked and required — `vite.config.ts` imports
`.figma/make/site.json`. Build breaks without it.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for layer rules and data flow.

## components/ui vs components/common

`components/ui/` holds shadcn/ui output, lowercase filenames. The CLI owns
these. Regenerate, do not hand-edit.

`components/common/` holds app wrappers, PascalCase, default-exported. They
carry the app's prop vocabulary and compose the primitives underneath.

They live apart for a hard reason: TypeScript rejects two files in one
directory differing only in casing (TS1149). `Button.tsx` next to `button.tsx`
fails `tsc`. Keep the split.

Only primitives actually used are present. Need another:

```
pnpm dlx shadcn@latest add tabs form
```

Pass `-y`. The CLI prompts for a preset if `components.json` is missing and
will hang a non-interactive shell.

## Styling

Tailwind v4 through `@tailwindcss/vite`, configured in `vite.config.ts`.
`src/index.css` imports Tailwind and `tw-animate-css` — the latter supplies
`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`, which the shadcn
dialog and popover need.

Theme tokens live in `src/index.css`. shadcn semantic tokens carry brand
values: `--primary` is brand teal `#1a6b61`, `--background` is page grey
`#f4f7f6`, `--ring` matches primary. Brand-only names with no shadcn
equivalent (`--color-sidebar`, `--color-online`, `--color-intruso`, …) sit in
the same `@theme inline` block.

Prefer semantic classes — `bg-primary`, `text-muted-foreground`, `border` —
over hardcoded hex. Roughly 40 `#1a6b61` literals still sit in `src/pages/`;
converting them is welcome cleanup, not required for unrelated work.

CSS `@import` statements come first in `index.css`. Font wiring belongs there.

## Forms

Every form uses react-hook-form with `zodResolver`. Schemas live in
`src/lib/schemas.ts` — one module, user-facing Spanish messages, rendered
straight from the resolver.

`components/common/FormField` spreads props onto the shadcn Input, so
`{...register("field")}` works directly. Pass `errors.field?.message` as
`error`. Use `Controller` for controlled widgets like `TimezoneCombobox`.

Use `formState.isSubmitting` for button loading state — make the submit handler
async instead of tracking a `loading` boolean by hand.

Add `noValidate` to the `<form>`; Zod owns validation, not the browser.

## State

Zustand for global client state, one store per concern in `src/stores/`. No
provider needed. `useSessionStore()` with no selector is fine here — session
state changes rarely, and fine-grained selectors would be optimization the
project does not need.

TanStack Query owns REST data and its cache, never Zustand. `src/lib/queryClient.ts`
sets defaults: `staleTime` 30s, `retry` 1, `refetchOnWindowFocus` off — live
traffic arrives over WebSocket, so focus refetching would re-pull pushed data.

`src/lib/http.ts` is the REST client: it prefixes `VITE_API_BASE_URL`
(default `http://localhost:3000/api/v1`), attaches the bearer access token from
`sessionStore`, always sends `credentials: "include"`, and normalises the
backend's `{statusCode, code, message}` envelope into `ApiError`.

Auth is wired: `src/api/auth.ts` plus `src/hooks/useAuth.ts`. So is the DVR
connection probe: `src/api/dvr.ts` plus `src/hooks/useDvr.ts`, and the monitor
behaviour screen: `src/api/cameras.ts` plus `src/hooks/useCameras.ts`.
Everything else still reads `src/data/mockData.ts`.

`cameras.ts` translates alert levels at the boundary — the API says
`intruder` / `suspicious`, the UI says `intruso` / `sospechoso`. Snapshot bytes
sit behind the same bearer token as the JSON routes, so `<img src>` cannot
reach them: `requestBlob` in `lib/http.ts` fetches them and `useSnapshotImage`
hands the component an object URL.

The access token lives in `sessionStore` in memory only. The refresh token is
an HttpOnly cookie the backend sets on `/auth/login` and `/auth/refresh`, so JS
never touches it — that is deliberate, do not move tokens to localStorage.
`AuthGate` in `App.tsx` holds the routes until the boot-time refresh settles.

There is no 401 auto-refresh interceptor yet. The access token lives 15
minutes, so add one before any page starts consuming protected endpoints.

## Tests

Vitest with jsdom, config in `vitest.config.ts` — standalone from
`vite.config.ts` on purpose, since the Figma plugins there are irrelevant to
tests. Files are `*.test.ts` / `*.test.tsx` beside their subject.

`src/test/setup.ts` registers jest-dom matchers, RTL cleanup, and stubs jsdom
is missing: pointer capture, `scrollIntoView`, `matchMedia`, `ResizeObserver`.
Radix throws without those.

Zustand stores are module singletons — reset with `useSessionStore.setState(...)`
in `beforeEach` or state leaks across tests.

## Code quality

- Double quotes for strings containing apostrophes (`"We're here to help"`), or
  escape them. Unescaped apostrophe in a single-quoted string breaks the build.
- Close JSX tags, balance braces.
- Components in `components/common/` and `pages/` use default exports. shadcn
  primitives use named exports — that is upstream convention, leave it.
- Path alias `@` maps to `src/`. Configured in both `vite.config.ts` and
  `vitest.config.ts`.

## Git

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before your first commit. Load-bearing
points:

- Repo-level git identity is `danielfrascarelli` / `dsanfra@gmail.com`. Verify
  with `git config user.name`; a global config will not do.
- `main` is production and never takes a feature branch. `develop` is the
  integration branch and every PR targets it.
- No AI-agent trace in any commit or PR. No `Co-Authored-By`, no session link,
  no "Generated with" footer.
- Commits and PRs written in English, Conventional Commits, caveman-full style.

Ops gotchas: [`docs/BEST_PRACTICES.md`](docs/BEST_PRACTICES.md).

## Caveman style

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries on this repo: commit messages, PR titles, PR descriptions and
documentation are written caveman-full too — English, terse, technical
substance intact. This overrides the plugin default of writing those normally.
Code itself, identifiers and error strings stay unchanged.
