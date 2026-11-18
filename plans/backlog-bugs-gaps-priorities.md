# Backlog — bugs, gaps, priorities

Whole-repo audit of `tu-seguridad-front`, cross-checked against the backend
route table in `tu-seguridad-back` and the product scope in [`ui.md`](../ui.md).

Audited 2026-08-22 on `feat/members-roster-invite-flow` (PR #10 open, 2 commits
ahead of `develop`).

Every finding below was read in the source, not inferred. Severity is impact on
a shipped build, not effort.

---

## 0. State today

`pnpm verify` green: typecheck, format, **128 tests / 20 files**, build in 462 ms.
Bundle 1.16 MB (358 kB gzip) — one chunk, over Vite's 500 kB warning, left alone
on purpose.

Coverage: **66.0 % statements / 58.6 % branch**. `src/api` 92 %, `src/lib` 91 %,
`src/pages/app` 38 %.

| Area | Backed by | Notes |
|---|---|---|
| Login | `POST /auth/login`, `/refresh`, `/me`, `/logout` | real |
| Invitation accept + complete profile | `POST /invitations/accept`, `/auth/complete-profile` | real |
| DVR probe + init | `POST /dvr/connection-test`, `PUT /dvr` | real |
| Dashboard camera panel | `GET /cameras`, `/cameras/:id/live` | real, live HLS verified end to end |
| Camera monitor + zones | `GET/PUT /cameras/:id`, zones CRUD, snapshots | real |
| Members roster | `GET /members`, `GET /invitations` | real |
| **Events** | `mockData.EVENTS` | backend `GET /events` exists, unused |
| **Comm channels** | `mockData.CHANNEL_CONFIG` | **no backend module at all** |
| **DVR config page** | hardcoded literal in the file | backend `GET/PUT /dvr` exists, unused |
| **Profile** | `sessionStore` only | no backend route exists |
| **Register / magic link / password reset** | `setTimeout` | backend routes exist, unused |
| **Live event feed** | — | backend `events.gateway.ts` exists, no client |

---

## P0 — ship blockers

### P0.1 Client-side auth bypass on two screens

`src/pages/auth/RegisterPage.tsx:35` sleeps 800 ms then calls
`sessionStore.login(values.email)`. `src/pages/auth/LoginPage.tsx:66` (the
Face-Auth button) does the same with no input at all. Both grant
`isLoggedIn: true`, `role: admin`, `profileCompleted: true` and **no access
token**. Every guard in `App.tsx` passes; every API call then 401s.

`src/stores/sessionStore.ts:58` is the shared primitive — `login()` takes no
token argument, so nothing downstream can tell a fake session from a real one.

Fix: wire both to real endpoints (`POST /auth/register`, `POST /auth/face/login`,
both return `AccessTokenDto`), then delete `sessionStore.login()`'s tokenless
path so the shape cannot come back.

### P0.2 Password reset accepts no token and fakes success

`src/pages/auth/PasswordChangePage.tsx:11` never reads `?token=`. Any anonymous
visitor gets the form and a "password changed" confirmation with no target
account and no backend call. Backend serves
`POST /auth/password-reset/confirm` with `ResetPasswordDto`.

### P0.3 Mailed links 404

| Mailer sends | Router serves |
|---|---|
| `/auth/magic` | `/auth/magic-link` (the *request* form, not a callback) |
| `/auth/reset-password` | `/auth/change-password` |

Both fall through `App.tsx:187`'s catch-all to `/`, then to `/login`. Even after
matching the paths, no page reads the token: `MagicLinkPage` has no
`useSearchParams`, so `POST /auth/magic-link/consume` has no caller.

Fix per the StrictMode note in [`docs/BEST_PRACTICES.md`](../docs/BEST_PRACTICES.md):
consume the token with a `useQuery` keyed on it, not a mount `mutate()` —
`InvitationAcceptPage` is the working reference.

### P0.4 No 401 auto-refresh

`src/lib/http.ts:57` throws `ApiError(401)` and stops. The access token lives
15 minutes. After that every query sits in an error state, `isLoggedIn` never
flips, and only a full reload recovers (the boot bootstrap replays the refresh
cookie). Already named in `ARCHITECTURE.md` as required before any page consumes
protected endpoints — five screens now do.

Fix: on 401, one `authApi.refresh()`, retry the original request once, force
`sessionStore.logout()` only if the refresh itself 401s. Guard against a refresh
stampede when several queries 401 together.

### P0.5 Two screens claim to save and save nothing

- `src/pages/app/CommChannelsPage.tsx:47` — `handleSave()` sets a "Guardado"
  flag. No request, no persistence.
- `src/pages/app/ProfilePage.tsx:56` — `handlePasswordSave()` shows "saved" and
  resets the form. Nothing else happens.
- `src/pages/app/ProfilePage.tsx:44` — `handleProfileSave()` writes to Zustand
  only; a reload discards it.

Channels and profile-update have **no backend route** (see P3.1), so the lazy
correct move is to disable the buttons and label them as not yet available
rather than keep lying. Fixing the lie is P0; wiring is P1/P3.

---

## P1 — backend is ready, frontend is not

Ordered by product value.

### P1.1 Live event feed over WebSocket

Backend `src/modules/events/events.gateway.ts` is complete: socket.io namespace
`events`, JWT via `handshake.auth.token`, per-space room, one message named
`alert-event`. Frontend has zero WebSocket code — this is the core product
promise in `ui.md` and nothing consumes it.

Needs `socket.io-client`, one hook owning the socket, alerts landing in a
Zustand store (`ARCHITECTURE.md` already reserves the slot).

### P1.2 Events page onto `GET /events`

`EventsPage.tsx` reads `mockData.EVENTS`. Backend serves `GET /events`
(`QueryAlertEventsDto` → `AlertEventPageDto`), `GET /events/:id` and
`GET /events/:id/deliveries` — the last one is exactly the "por qué canal se
envió" column the page already renders from fixtures.

Two bugs to fix in the same pass:

- `EventsPage.tsx:50` — subtitle reads `EVENTS.length`, so the count ignores the
  active filter.
- `EventsPage.tsx:41` — the date filter is `evDate < filterDate`, a "from" bound
  only. `ui.md:107` asks for date filters plural (a range).

### P1.3 DVR config page onto `GET`/`PUT /dvr`

`DVRConfigPage.tsx:7` ships a hardcoded `DEFAULT_VALUES` object with
`dvrPassword: "admin123"` committed in source, and `handleConfirm()` does
`console.log`. Backend serves `GET /dvr` and `PUT /dvr`; `useDvr.ts` already
exports `useConfigureDvr`. The confirm modal warning `ui.md:87` asks for is
already built.

### P1.4 Register, magic link, password reset (the real wiring)

Same endpoints as P0.1–P0.3, once those stop lying. `POST /auth/register`,
`/auth/password-reset/request|confirm`, `/auth/magic-link/request|consume`.

### P1.5 Face-Auth

`POST /auth/face/identities` (enrol, authenticated) and `POST /auth/face/login`.
`ui.md:34` scopes the MVP to a button next to magic link — the button exists and
currently fakes a session (P0.1).

---

## P2 — data-layer bugs

All verified in source.

| Sev | Where | Problem | Fix |
|---|---|---|---|
| MED | `src/lib/schemas.ts:123`, `:233` | `avatarUrl: z.string().nullable()` while every sibling optional uses `.nullish()`. A backend that *omits* the key (vs sending `null`) throws `ZodError` on a valid `/auth/me` or `/members` response | `.nullish()` |
| MED | `src/api/cameras.ts:173` | `saveZones` fans create/update/delete out through one `Promise.all`; one rejection still lands its siblings, and `useSaveCamera` has no `onError`, so the zones cache keeps the pre-save state — the UI then shows zones the backend does not have | invalidate `cameraKeys.zones(cameraId)` on error |
| MED | `src/hooks/useCameras.ts:74` | `useSetCameraEnabled` invalidates only `cameraKeys.list`. `cameraKeys.live(id)` has `retryOnMount: false` + 5 min `staleTime`, so a camera that 409'd while disabled will not retry live playback for five minutes after being re-enabled | also invalidate/remove `cameraKeys.live(id)` |
| MED | `src/hooks/useDvr.ts:45` | `useConfigureDvr` seeds `dvrKeys.current` but never invalidates `cameraKeys.list`, and `PUT /dvr` runs discovery server-side (`api/dvr.ts:40`). Harmless during onboarding (dashboard mounts fresh); becomes a stale camera list the moment P1.3 lands and the config page can re-point a live DVR | add `invalidateQueries({queryKey: cameraKeys.list})` |
| LOW | `src/hooks/useAuth.ts:104` | `logout` clears locally `onSettled`, so a network failure leaves the HttpOnly refresh cookie valid — a reload silently re-authenticates. The comment says this is deliberate ("a dead network must still clear the session") and that tradeoff is defensible; document it or retry the call on reconnect | decide, then write it down |

---

## P3 — product gaps vs `ui.md`

### P3.1 Blocked on backend — no route exists

- **Comm channels** (`ui.md:121`). No `channels` module in the backend at all.
  The whole screen is unimplementable until the API lands: alert-level → channel
  routing, and per-member opt-in.
- **Profile edit** (`ui.md:57`). No `PUT /auth/me` and no authenticated
  change-password route. `POST /auth/complete-profile` is onboarding-only.
- **Member management** (`ui.md:113`). Only `GET /members`. No deactivate, no
  role change — the roster is read-only by construction.
- **Grabaciones**, **Notificaciones**, **Ayuda** — sidebar entries pointing at
  `#` (`Sidebar.tsx:29,34,35`). No backend module for any of them. Either build
  the API or drop the nav items; three dead links in a five-item menu reads as a
  broken app.

### P3.2 Frontend-only

- `ui.md:95` describes the dashboard invite button as *redirecting* to the
  members area, where a modal opens. `DashboardPage.tsx:53` opens `InviteModal`
  inline instead (`:135`). Fewer clicks and arguably better; flagged only so the
  divergence from spec is a decision rather than an accident. Either amend
  `ui.md` or change the button — do not leave it undecided.

---

## P4 — accessibility

The zone editor is the operator's main tool and half of it is unreachable
without a mouse.

| Sev | Where | Problem |
|---|---|---|
| HIGH | `ZoneEditor.tsx:170` | Alert-type toggle is a real `<button>` wired only to `onPointerDown`. Enter/Space fire `click`, so keyboard and screen-reader users get a no-op. Move the `updateZone` call to `onClick`; keep `onPointerDown` solely for the `stopPropagation` that blocks draw-start |
| HIGH | `ZoneEditor.tsx:182` | Same defect on the `×` delete button (`aria-label="Borrar zona"` — focusable, announced, inert) |
| MED | `CameraCard.tsx:60` | Whole card is `<div onClick={navigate}>` with no `role`, `tabIndex` or key handler. Keyboard users skip every card in the grid |
| MED | `ZoneEditor.tsx:70` | Drawing a zone is pointer-only. Even with the two fixes above, a keyboard operator can retag and delete zones but never create one. Known gap — needs an explicit keyboard tool if compliance demands it |
| MED | `CameraMonitorPage.tsx:127,175,264` | Save/capture errors render as plain `<p>`. `DashboardPage.tsx:62` already uses `role="alert"` for the same case — match it |
| LOW | `CameraCard.tsx:116` | Kebab menu: no `aria-expanded`/`aria-haspopup`, no `role="menu"`, no Escape-to-close |
| LOW | `DashboardPage.tsx:98` | "Cámaras desactivadas" collapse toggle has no `aria-expanded` |
| LOW | `index.html:2` | Ships `lang="en"` (see P5.1) on an entirely Spanish UI — wrong screen-reader voice for every string in the app |

---

## P5 — hygiene

### P5.1 Production build still identifies as a Figma template

`dist/index.html` ships:

```html
<title>Figma Make App</title>
<meta name="description" content="Enables users to upload detailed documents and example designs to visualize styles, colors, and sizes for effective project planning.">
```

Both come from `.figma/make/site.json`, which has no `title` and no `lang`, and
whose `description` belongs to some other template entirely. Same strings go
into the `og:` tags. One-line fix in that JSON.

### P5.2 No CI, and the git hooks path points at nothing

`.github/` holds only `copilot-instructions.md` — no workflow file. Meanwhile
`git config core.hooksPath` is `.githooks`, which **does not exist** at the repo
root; the hooks live at `.standards/.githooks/`. Every hook is silently inert
right now, including the agent-trailer check.

`.standards/` is a nested clone and is untracked (`git status` shows `??`).
`.standards/standards/CHECKS.md` defines six required checks; this repo exposes
five (`format`, `lint`, `typecheck`, `test`, `build`) and has **no `security`
script** (dependency audit + secret scan).

### P5.3 Test coverage holes

Zero-coverage files that carry real logic:

- `src/components/camera/LiveThumbnail.tsx` — 0 %, the whole hls.js lifecycle
- `src/components/zone-editor/ZoneList.tsx` — 0 %
- `src/components/common/ConfirmModal.tsx` — 0 % (the DVR "you may lose camera
  config" warning path)
- `src/pages/app/CommChannelsPage.tsx` — 16 %
- `src/components/layout/TopBar.tsx` — 41 %
- `src/hooks/*` — no test file at all for any of the five hooks

`src/api/dvr.ts`, `members.ts`, `invitations.ts` have no sibling test; `auth.ts`
and `cameras.ts` do.

### P5.4 Dead code and drift

- `mockData.ts` exports `SecurityEvent`, `Member`, `ChannelConfig` — **imported
  nowhere**. Delete once Events and Channels move off fixtures.
- 19 `#1a6b61` literals across `TopBar`, `CameraMonitorPage`, `CommChannelsPage`,
  `DashboardPage`, `EventsPage`. Convert to `bg-primary` / `text-primary` as
  those files are touched, not as a standalone sweep.
- `src/index.css:35` has a complete `.dark` block and nothing toggles it. Either
  add the toggle or delete the block — a theme nobody can reach is dead weight.
- `src/pages/app/CameraMonitorPage.tsx:105` — save `onSuccess` patches only
  `draft.zones` from the response and drops the returned `camera`, so any
  server-side normalisation (trim, etc.) silently disagrees with the draft.

### P5.5 Credential rotation, carried over

[`plans/live-hls-dvr-rtsp-debug.md`](live-hls-dvr-rtsp-debug.md) closes with the
Hik-Connect `verificationCode` and the DVR admin password exposed in cleartext
during that debug session. Both still need rotating. Unrelated to this repo's
code, tracked here so it does not get lost.

---

## Suggested order

1. **P0.5** — stop the two screens lying (button disable, ~20 lines).
2. **P0.4** — 401 refresh. Everything downstream assumes it.
3. **P0.1–P0.3** — auth bypass, reset token, mailed link paths. One auth pass.
4. **P4 HIGH** — two `onPointerDown` → `onClick` moves in `ZoneEditor`.
5. **P2** — the five data-layer fixes; small, independent, mostly one-liners.
6. **P1.1** — WebSocket feed. Biggest product win, backend already waiting.
7. **P1.2, P1.3** — Events and DVR config off fixtures.
8. **P5.1, P5.2** — metadata and CI. Cheap, visible.
9. **P3.1** — needs backend work scheduled first.

---

## Deliberately not doing

- **Code splitting the 1.16 MB bundle.** `ARCHITECTURE.md` rules it out and the
  app is served over LAN to a handful of operators. Revisit only if a lazy
  `import("hls.js")` in `LiveThumbnail.tsx:2` becomes worth the diff — that one
  dependency is most of the weight and is needed only on hover.
- **A dark-mode toggle.** Nobody asked. Either delete the `.dark` block or leave
  it; do not build the switch on spec.
- **A hex-literal sweep as its own commit.** Nineteen literals, all cosmetic,
  all in files that other work will touch anyway.
- **`useMemo`/`React.memo` anywhere.** Banned in `AGENTS.md` without a
  measurement.
