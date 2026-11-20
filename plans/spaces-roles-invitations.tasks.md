# Spaces, roles, permissions, invitations — status and handoff

> Tracker for [`spaces-roles-invitations.md`](spaces-roles-invitations.md) (front) and the back plan
> `tu-seguridad-back/plans/08.spaces-roles-invitations.md` + `.tasks.md` (back details, decisions).
> Both repos on branch `feat/spaces-roles-invitations` (from `develop`). Nothing pushed yet.

## Status

| Task | Repo | Status | Commit | Notes |
|---|---|---|---|---|
| T01 schema + migration | back | ✅ | a1f4c5f | many memberships, roles admin/collaborator/guest, menuAccess/cameraIds JSON |
| T02 per-request membership guard | back | ✅ | dd0ed4a | token has no role; SpaceMemberGuard loads role/menu/cameras each request |
| T03 spaces, switch, /auth/me | back | ✅ | a65f580 | GET/POST /spaces, PATCH/DELETE /spaces/current, POST /auth/switch-space |
| T04 invitations + mail | back | ✅ | e5ca5a9 | preview, mine, accept/decline, resend, revoke, register with inviteToken |
| T06 locale (es/en) | back | ✅ | 9983ced | user/invitation locale; all mails bilingual |
| T05 members + scoping | back | ✅ | ad9a0f2 | PATCH/DELETE /members, guest camera scoping everywhere, GET /dvr gated, `currentSpace.hasDvr` |
| F00 i18n | front | ✅ | b26b74e, d92a910 | own dictionaries, profile language select, persisted on account |
| F01 session, switcher, gates | front | ✅ | c044099 | useCan, SpaceSwitcher, RequireMenu, /spaces/start, not-configured screen, read-only edit gating |
| F03 invite modal + members tab | front | ✅ | 3880ccc | role/menu/cameras/locale on invite; MemberEditSheet; resend/revoke; /auth/me refetch on focus |
| F02 invitation landing, my invitations | front | ✅ | see git log | preview landing, login `next`/`email`, register with inviteToken, /invitations, list on /spaces/start, link on not-configured screen |

Last verification: back unit 833, int 54, e2e 147/148 (only known failure: `assistant.e2e-spec`
"CONFLICT while disabled", caused by local `.env` `ASSISTANT_ENABLED=true`). Front `pnpm verify`
241 tests green after F02.

## F02 (done) — what it does

- `InvitationAcceptPage` rewrite: `GET /invitations/preview?token=` (public; any bad state = 404).
  Logged out: button to `/login?email&next=/invitations/accept?token=…` if `userExists`, else
  `/register?inviteToken&email`. Logged in same email (case-insensitive): Aceptar
  (`POST /invitations/:id/accept` returns `{accessToken}` → `enterSpace` from `useSpaces.ts`) /
  Rechazar (`POST …/decline` 204 → `openSession()` + invalidate mine). Other email: message +
  Cerrar sesión. Preview query disabled while accept is pending/succeeded (avoids 404 refetch).
- `LoginPage`: prefill `?email`; when logged in `<Navigate to={safeNext(next)}>` (only `/…`, not
  `//` or `/\`); App `/login` route no longer redirects itself.
- `RegisterPage` with `?inviteToken`: email readonly, no spaceName, sends `inviteToken` + locale,
  then navigates back to the landing (user created with `profileCompleted: true`, no space).
  Errors 404 → `invitations.gone`, 403 → `auth.register.inviteMismatch`.
- `GET /invitations/mine` (bare array) → `MyInvitationsList` component, used on new
  `/invitations` page (DVRGate `need: "anySpace"`; no space → `/spaces/start`) and on
  `/spaces/start` when `pendingInvitationsCount > 0`.
- Remove old auto-login `useAcceptInvitation(token)` query.
- Link to `/invitations` on the not-configured screen when there are pending invitations.

## Decisions (front)

| Decision | Why |
|---|---|
| Nav item gate field is `menu`, not `key` | avoid confusion with React `key` |
| `useMembers` query enabled only with `canView("members")` | GET /members needs that section; fixes Channels/Events callers at once |
| Channels without `members`: recipients card replaced by a note; routing editable with `canEdit("channels")`; member alert switch admin-only | PATCH /members is admin-only |
| DVRGate reads `currentSpace.hasDvr`, never GET /dvr | GET /dvr needs `dvr` section (owner decision: closed to others) |
| Space change: `queryClient.removeQueries()` **before** `openSession()` | clearing after would drop the queries the new render starts |
| `menuAccess` parsed with `z.enum(MENU_KEYS)` | parsed-not-cast rule; a new back key breaks `me()` until front adds it |
| `FIXTURE_USER.menuAccess` is a literal list | importing MENU_KEYS there caused a runtime import cycle; keep in sync by hand |
| Back error messages shown verbatim (English) | codebase rule in `http.ts`; self-role/self-remove 409 unreachable from UI anyway |
| `/auth/me` refetch on window focus/visibility, 30 s module-level throttle, errors ignored | permission changes reach users without reload; not via `openSession` (it logs out on error) |
| Invite default role: collaborator; role change resets menu to role defaults | mirrors back `DEFAULT_MENU_ACCESS` (front copy in `permissions.ts`) |
| No confirm on Revocar | re-inviting is cheap |

Back decisions: see `tu-seguridad-back/plans/08.spaces-roles-invitations.tasks.md` (decisions
table). Key ones: no new ErrorCodes (FORBIDDEN/CONFLICT + message); last-admin protected
structurally (admin can't change own role or remove self → 409); no authenticated event-ack route
exists (only public mailed link); socket rooms fixed at connect (camera/role change applies on
reconnect); GET /dvr gated by `dvr` section.

## Open items

- Manual end-to-end with mailpit (`MAIL_ENABLED=true`, mailpit on :8025): A invites B (new) as
  guest with camera 1 → B registers from mail → accepts → sees only camera 1; A invites C
  (existing) → C accepts from `/invitations` → switches spaces. Mail visual check never done.
- Remove deprecated `spaceId/spaceName/role` from back `/auth/me` (front no longer reads them).
- Plan 03 §1 one-space rule: annotate as superseded by 08.
- DB: `face_auth_admin` has no grants on `tu-seguridad-shadow` (empty DB created), so
  `prisma migrate dev` fails; migrations are hand-written + `migrate deploy`. Owner: grant or drop.
- Push both branches / PRs (not done; ask owner).

## Environment notes

- Front needs Node 22: `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH`.
- Back int tests: `pnpm exec jest --runInBand --config test/jest-int.json --testPathIgnorePatterns='/node_modules/' --testPathIgnorePatterns='/.claude/'` (stale worktree copy under `.claude/`).
- Local test member: `face.auth.dashboard.test@gmail.com` / `test-permisos`, collaborator in
  "Espacio de Daniel" (user id 3).
- Never commit: package.json, lockfiles, `.serena`, `.env`, `.claude/`, `.standards/`,
  `pnpm-workspace.yaml`, `docs/DEPLOY_ROADMAP.md`. Commit as danielfrascarelli, no Claude trailers.
