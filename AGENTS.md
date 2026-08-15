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
| `pnpm test` | Vitest, single run |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm verify` | typecheck, test, build — run before every commit |
| `pnpm lint` | `oxfmt --check src`. Currently fails repo-wide. See below |
| `pnpm format` | **Do not run.** Corrupts TypeScript. See below |

No ESLint in this repo.

### Do not run `pnpm format`

oxfmt 0.2.0 drops the `;` member separator inside single-line TypeScript type
literals and writes nothing in its place, producing code that does not parse:

```ts
// before
children?: { label: string; to: string }[]
// after oxfmt
children?: { label: string to: string }[]   // TS1005: ';' expected
```

Reproducible on a 7-line file. It hits pre-existing code too —
`src/components/layout/Sidebar.tsx` and any inline type literal.

So `pnpm lint` fails on 45 of 55 files and its autofix cannot be trusted.
Formatting is therefore not enforced, and `verify` deliberately excludes it.
Match the style of the file you are editing.

Unblocking it is a tooling decision for the repo owner: upgrade oxfmt once the
bug is fixed upstream, or swap in Prettier. Do not paper over it by running
`format` and committing the damage.

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
  App.tsx               QueryClientProvider > BrowserRouter > route table
  index.css             Tailwind entry, theme tokens, base layer
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
  lib/                  utils (cn), queryClient, schemas (all Zod)
  data/                 mockData, timezones — fixtures, no backend wired yet
  test/setup.ts         Vitest setup: jest-dom, RTL cleanup, jsdom stubs
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

No REST client exists yet. Pages read `src/data/mockData.ts`.

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
