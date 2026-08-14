# Best practices / gotchas

Ops + tooling lessons from building this repo. Not architecture (see [`ARCHITECTURE.md`](../ARCHITECTURE.md)), not workflow (see [`CONTRIBUTING.md`](../CONTRIBUTING.md)) — "learned it the hard way once, write it down so nobody repeats it."

## git / gh

- Repo git identity set at repo level (`git config user.name/user.email`), separate from any global config. Verify before first commit in a new clone/worktree: `git config user.name` should say `danielfrascarelli` / `dsanfra@gmail.com`.
- `gh` may have multiple accounts logged in. Check push access BEFORE assuming: `gh repo view LucianaPrat/tu-seguridad-back --json viewerPermission`. If it says `READ`, switch: `gh auth switch --user danielfrascarelli`.
- GitHub repo canonical casing is `LucianaPrat/tu-seguridad-back` (capital L/P) — `gh api`-backed commands (`gh repo view`, `gh repo edit`) need exact case or 404. Plain `git push`/`git clone` over https redirect fine either way.
- No AI-agent trace in any commit/PR — see [`CONTRIBUTING.md`](../CONTRIBUTING.md). PR descriptions on this repo written caveman-full style (session-level convention, not a tool default).
- git worktrees (`git worktree add`) only check out committed history. Untracked files — `.env`, any in-progress uncommitted work — do NOT come along. Copy them in manually before running anything that needs them.
- Branch model: `main` = production, never receives a feature branch directly. `develop` = integration branch. `feature/*`, `fix/*`, `chore/*` branch off `main`, PR target always `develop`.
 
## Working with AI agents on this repo

- Never leave Claude/Codex/agent traces in commits or PRs — human identity only. Full rule: [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- Session workflow for plan tasks: one agent (higher-effort model) plans a task into a concrete, unambiguous blueprint (exact files/signatures/decisions) before any code written; a second agent implements that blueprint literally; orchestrating session verifies build/lint/test itself before committing. Keeps implementation agents from making silent judgment calls on ambiguous plan wording.
- `plans/01.setup.tasks.md` is live source of truth for "what's done" — update it every time a task finishes, before moving to next one.
