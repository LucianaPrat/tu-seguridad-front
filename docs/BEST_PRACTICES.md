# Best practices / gotchas

Ops + tooling lessons from building this repo. Not architecture (see [`ARCHITECTURE.md`](../ARCHITECTURE.md)), not workflow (see [`CONTRIBUTING.md`](../CONTRIBUTING.md)) — "learned it the hard way once, write it down so nobody repeats it."

## git / gh

- Repo git identity set at repo level (`git config user.name/user.email`), separate from any global config. Verify before first commit in a new clone/worktree: `git config user.name` should say `danielfrascarelli` / `dsanfra@gmail.com`.
- `gh` may have multiple accounts logged in. Check push access BEFORE assuming: `gh repo view LucianaPrat/tu-seguridad-front --json viewerPermission`. If it says `READ`, switch: `gh auth switch --user danielfrascarelli`.
- GitHub repo canonical casing is `LucianaPrat/tu-seguridad-front` (capital L/P) — `gh api`-backed commands (`gh repo view`, `gh repo edit`) need exact case or 404. Plain `git push`/`git clone` over https redirect fine either way.
- No AI-agent trace in any commit/PR — see [`CONTRIBUTING.md`](../CONTRIBUTING.md). PR descriptions on this repo written caveman-full style (session-level convention, not a tool default).
- git worktrees (`git worktree add`) only check out committed history. Untracked files — `.env`, any in-progress uncommitted work — do NOT come along. Copy them in manually before running anything that needs them.
- Branch model: `main` = production, never receives a feature branch directly. `develop` = integration branch. `feature/*`, `fix/*`, `chore/*` branch off `main`, PR target always `develop`.
 
## Working with AI agents on this repo

- Never leave Claude/Codex/agent traces in commits or PRs — human identity only. Full rule: [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- Session workflow for plan tasks: one agent (higher-effort model) plans a task into a concrete, unambiguous blueprint (exact files/signatures/decisions) before any code written; a second agent implements that blueprint literally; orchestrating session verifies build/lint/test itself before committing. Keeps implementation agents from making silent judgment calls on ambiguous plan wording.
- Verify with `pnpm verify` (typecheck, lint, test, build) before committing. Do not trust an agent's claim that it passed.

## Toolchain

- **Node 22 required.** `.mise.toml` pins it, `engines.node` states it. On Node 20 `pnpm test` dies with `webidl.util.markAsUncloneable is not a function` — jsdom 30 pulls undici 8, which calls a Node 22 API. The error names undici, not your Node version, so it reads like a dependency bug. It is not. Check `node --version` first.
- If `mise` is not on PATH, your shell may silently fall back to an nvm Node. `which node` before blaming the code.
- `.mise.toml` pins pnpm 10.34.3. A different local pnpm still installs fine, but lockfile churn is on you.

## oxfmt corrupts TypeScript — do not run `pnpm format`

oxfmt 0.2.0 removes the `;` member separator inside single-line type literals and puts nothing in its place. Result does not parse.

```ts
children?: { label: string; to: string }[]   // before
children?: { label: string to: string }[]    // after — TS1005: ';' expected
```

Reproducible on a 7-line file, so it is the formatter, not our code. It damages pre-existing Figma-exported code as well — `src/components/layout/Sidebar.tsx` has exactly that shape.

Consequences, all deliberate:

- `pnpm verify` runs typecheck, test and build only. Formatting is not enforced.
- `pnpm lint` (`oxfmt --check src`) fails on 45 of 55 files. That is expected; the tree was never oxfmt-formatted, and formatting it would break the build.
- If you run `format` by accident, `git checkout -- src/` restores it. Confirm with `pnpm typecheck` before committing anything.

Fix is a repo-owner call: upgrade oxfmt after the upstream fix, or replace it with Prettier. Until then, match the style of the file you are editing.

## Tailwind v4 + shadcn/ui

- `pnpm dlx shadcn@latest init` prompts for a preset with no flag to skip it, so it hangs a non-interactive shell and writes nothing. Hand-write `components.json` instead, then `shadcn add <component> -y` works unattended.
- `shadcn add` does NOT write theme variables into `src/index.css`. Primitives reference `bg-background`, `border-input`, `ring-ring` and render unstyled until those tokens exist. Add them yourself.
- shadcn primitives need `tw-animate-css` imported in `index.css` for `animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`. Dialog and popover animations are silently dead without it.
- Current shadcn output imports from the unified `radix-ui` package, not `@radix-ui/react-*`. Installing the individual packages is wasted weight.

## TypeScript

- TS1149: two files in one directory differing only in casing fail `tsc`, even on a case-sensitive filesystem. `Button.tsx` cannot sit beside shadcn's `button.tsx`. That is why app wrappers live in `src/components/common/` and shadcn primitives own `src/components/ui/`.

## Vitest

- Radix components throw in jsdom without stubs for pointer capture, `scrollIntoView`, `matchMedia` and `ResizeObserver`. All four are stubbed in `src/test/setup.ts`.
- Zustand stores are module singletons — state leaks between test files. Reset with `useSessionStore.setState(...)` in `beforeEach`.
- `vitest.config.ts` is separate from `vite.config.ts` on purpose. `vite.config.ts` is Figma Make managed; editing it invites a regeneration conflict.

## git worktrees

- A fresh worktree has no `node_modules`. Run `pnpm install` in it before anything.
- A worktree branched from `main` will not contain work that only exists on `develop`. Branch from `develop` when you need the current tree.
