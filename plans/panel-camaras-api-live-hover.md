# Dashboard camera panel — off fixtures, onto the API, with live hover

## Context

The screen in the screenshot (`Panel de cámaras`, route `/`, `src/pages/app/DashboardPage.tsx`) is
the last camera screen still running entirely on `src/data/mockData.ts`. It looks finished and is
not: thumbnails are public Unsplash URLs, `"2 min"` is a hardcoded fixture string, the pulsing
"EN VIVO" pill overlays a static JPEG, and `Desactivar` mutates local `useState` that dies on
reload. `CameraMonitorPage` is already on the real API — the dashboard is the odd one out.

`ui.md` (Dashboard section) asks for: thumbnail + Online/Offline badge, age of the frame, hover
goes realtime, unconfigured cameras marked, disabled cameras collapsed below, discreet invite
button. All of it is buildable today.

**Endpoint review — nothing is missing.** Against `tu-seguridad-back` on `develop`:

| What the screen needs | Endpoint | Status |
|---|---|---|
| camera list | `GET /cameras` | exists, already used by `useCameras` |
| enable/disable | `PUT /cameras/:id` | exists; every `UpdateCameraDto` field is `@IsOptional()`, so a `{isEnabled}`-only body is valid |
| thumbnail bytes | `GET /snapshots/:id` | exists, ETag'd, already used by `useSnapshotImage` |
| frame age | `lastSnapshotAt` on the camera DTO | exists, computed client-side |
| hover live | `GET /cameras/:id/live` | exists (`cameras.controller.ts:182`) |
| invite | `POST /invitations` | exists |

The "missing" enable/disable and invite endpoints were front gaps, not backend gaps. No handoff to
back is needed. One note for a later pass, no work requested: a members-list endpoint with
`lastLoginAt` does not exist (`ui.md` → "Miembros del espacio"); nothing exposes `SpaceMember`.

Scope decided with the user: **dashboard screen only** — Members stays out, only its invite button
gets resolved. Sidebar duplicate fixed, `#` placeholders kept.

## The live contract

`GET /api/v1/cameras/:id/live` (bearer) → `LiveStreamDto`:

```json
{ "protocol": "hls", "url": "http://127.0.0.1:8888/<cameraId>/index.m3u8" }
```

MediaMTX pulls RTSP from the recorder only while somebody watches and repackages it as HLS. The URL
holds no secret: the media server calls `POST /streaming/authorize` for the playlist **and every
segment**, so each request has to carry the caller's bearer token. That is the load-bearing detail —
`<video src={url}>` cannot attach a header, so a bare `<video>` gets a 401 on the playlist. The
backend's own docstring says it: play with `hls.js`, attaching the token through `xhrSetup`.

Failures that must degrade silently to the stored snapshot, not to an error toast:

- `409` — camera disabled, **or `MEDIAMTX_ENABLED` off on this deployment**. The likely answer on a
  dev box, so this path has to look deliberate: snapshot stays, no pill, nothing logged.
- `404` / `502` / `504` — no recorder, media server refused or timed out. Same treatment.

`hls.js` needs MSE, which every desktop browser has. iOS Safari is the exception; irrelevant for a
LAN operator console, and worth a comment rather than a fallback. If the media server's origin
refuses the app's origin, the playlist fails CORS and the card falls back to the snapshot — a
MediaMTX config matter, not a front one.

## Front changes

### Dependency

Add `hls.js`. `ARCHITECTURE.md:208-210` already names it as the sanctioned choice for HLS, so this
is not a stack change. `pnpm add hls.js`.

### New files

- `src/lib/time.ts` — `relativeTime(iso: string | null): string | null`, returning `"2 min"`,
  `"1 h"`, `"3 d"`, `null` for null. Plain arithmetic on `Date.now()`, no dependency. Replaces the
  fixture's `snapshotAge` string. (`EventsPage`/`MembersPage` hand-roll absolute `toLocaleString`
  calls — different job, leave them.)
- `src/lib/time.test.ts` — the one runnable check, on the bucket boundaries.
- `src/api/invitations.ts` — `createInvitation(email: string)` → `POST /invitations`, Zod-parsed.
- `src/hooks/useInvitations.ts` — `useCreateInvitation()`.
- `src/components/camera/LiveThumbnail.tsx` — the live player, mounted **only while hovered** so
  mount/unmount is the whole lifecycle and there is no `active` flag to thread:
  - `useCameraLive(cameraId)` for the URL.
  - one effect: `new Hls({ xhrSetup })` → `loadSource(url)` → `attachMedia(video)`; cleanup
    `hls.destroy()`. `xhrSetup` reads the token as
    `useSessionStore.getState().accessToken` **inside the callback**, so a token refreshed
    mid-stream is picked up rather than captured stale.
  - `<video muted playsInline>` — autoplay of an unmuted element is blocked.
  - `onPlaying` flips a local `playing` state; the parent learns through an `onPlaying` prop, which
    is what gates the pill. No pill until frames actually arrive.
  - `// ponytail: hls.js only, protocol is "hls" today. Branch here if a second transport lands.`

### `src/lib/schemas.ts`

Add `liveStreamResponseSchema` (`protocol: z.literal("hls")`, `url: z.string()`) and
`invitationResponseSchema`, each exporting its inferred type beside it, in the file's existing
style. **This file is edited by one agent only** — see Delegation.

### `src/api/cameras.ts`

- `setCameraEnabled(id: string, isEnabled: boolean)` → `PUT /cameras/${id}` with body
  `{ isEnabled }`, returning `toCamera(...)` like `updateCamera` does. `CameraSettings` stays
  untouched.
- `getCameraLive(id: string)` → `GET /cameras/${id}/live`, parsed by `liveStreamResponseSchema`.

### `src/hooks/useCameras.ts`

- add `live(cameraId)` to the `cameraKeys` factory (`:9-13`).
- `useSetCameraEnabled()` — mutation over `setCameraEnabled`, invalidates `cameraKeys.all` on
  success. This is what makes `Desactivar` survive a reload.
- `useCameraLive(cameraId: string)` — query over `getCameraLive`, `retry: false` so a 409 on a
  streaming-disabled deployment costs exactly one request, and a long `staleTime` so re-hovering a
  card does not re-register it with the media server.

### `src/pages/app/DashboardPage.tsx`

- Replace `useState<Camera[]>(CAMERAS)` with `useCameras()`; `Camera` now from `@/api/cameras`.
- Keep the three buckets as they are (`:17-19`) — they are correct.
- `toggleEnabled` becomes `useSetCameraEnabled().mutate(...)`.
- Add the pending and error states the page lacks; reuse the empty-state card markup at `:49-51`
  for shape, and `ApiError.message` for the failure copy (same `errorMessage` shape as
  `CameraMonitorPage.tsx:27-29`).
- Rename `unconfiguredOpen` → `disabledOpen`: it drives the *disabled* section, not the
  unconfigured one.

### `src/components/camera/CameraCard.tsx`

- Take the `@/api/cameras` `Camera`.
- Thumbnail: `useSnapshotImage(camera.snapshotUrl, camera.lastSnapshotAt)`
  (`src/hooks/useCameras.ts:81`) instead of `<img src={camera.snapshotUrl}>`. Placeholder when
  `null`, keep a meaningful `alt`.
- Age: `relativeTime(camera.lastSnapshotAt)`, still gated on `status === "online"`.
- Hover → live: on `mouseEnter`, start a **~300 ms** timer before mounting `<LiveThumbnail>`;
  cancel it on `mouseLeave`. Dragging the pointer across a 4-up grid otherwise registers every
  camera it crosses with the media server and pulls RTSP from each. Gate on
  `camera.status === "online"`.
- The "EN VIVO" pill renders only once `LiveThumbnail` reports `onPlaying`. It currently fires on
  hover alone (`:33-40`) over an image that never changes — that pill states something false today
  and must not survive this change in that form.
- `Configurar` → `/cameras/monitor?camera=${camera.id}`. Today it navigates with no id (`:80-88`)
  and the monitor page silently edits `cameras[0]`, so an operator configuring "Cámara 04" writes
  zones onto "Cámara 01".
- Give the root the `onClick` its `cursor-pointer` (`:20`) already promises — same destination as
  `Configurar`.
- Delete the `variant="unconfigured"` badge branch (`:48-52`): unreachable, `DashboardPage.tsx:93`
  routes every unconfigured camera to the other card.
- Delete the unused `menuRef` (`:15`).
- Compose classNames through `cn()` (`src/lib/utils.ts:5`) where branch logic warrants it.

### `src/components/camera/CameraCardUnconfigured.tsx`

- Same type swap and `useSnapshotImage`, keeping `grayscale opacity-40`. No live on these.
- `Configurar` → `/cameras/monitor?camera=${camera.id}`.
- Delete the `...` button (`:40-42`) — no `onClick`, never had one.

### `src/pages/app/CameraMonitorPage.tsx`

Seed `selectedId` from `useSearchParams().get("camera")` so the deep link lands on the right camera;
keep the `?? cameras?.[0] ?? null` fallback (`:35`) for a bare visit.

### `src/components/common/InviteModal.tsx`

Replace the `setTimeout` stub (`:28-31`) with `useCreateInvitation()`. Surface a failure in a
`role="alert"` banner distinct from the field error; keep `inviteSchema` and
`formState.isSubmitting`. Shared with `MembersPage.tsx:89`, so that button starts working too —
which is the whole of Members in this pass.

### `src/components/layout/Sidebar.tsx`

Drop the `Cámaras` entry from `SERVICE_ITEMS` (`:29`): it points at `/`, the same route as `Inicio`
(`:25`), which is why both highlight in the screenshot. `Inicio` *is* the camera panel.
`Grabaciones` / `Notificaciones` / `Ayuda` keep their `"#"` placeholders; `NavItemLink` already
suppresses the active style for them (`:47`).

### `src/data/mockData.ts`

`DashboardPage` is the last consumer of `CAMERAS` (verified — no other `src/` reference). Delete the
`CAMERAS` array and the `snapshotAge` field from the fixture `Camera` interface. Leave the rest:
`SecurityEvent`, `Member`, `ChannelConfig`, `MonitorZone`, `AlertType`, `MonitorMode` are still the
shared domain types.

### Tests

- `src/lib/time.test.ts` — `relativeTime` boundaries.
- `src/pages/app/DashboardPage.test.tsx` — first test for this screen. `renderWithProviders` plus
  `mockFetchSequence` (`src/test/mockFetch.ts`), stubbed at the HTTP boundary: the three buckets
  render, and `Desactivar` issues `PUT /cameras/:id` with `{isEnabled:false}`. Queries by role or
  accessible name. `hls.js` is not exercised — no MSE in jsdom, so `LiveThumbnail` mounts only on
  hover and the test does not hover.

## Delegation

Main session orchestrates and runs verification itself; the edits go to subagents, cheapest model
that will do the job. File ownership is disjoint inside a wave so two agents never write one file.

| Wave | Agent | Files |
|---|---|---|
| 1 | haiku builder | `src/lib/time.ts`, `src/lib/time.test.ts` |
| 1 | haiku builder | `src/components/layout/Sidebar.tsx` |
| 1 | sonnet | `src/lib/schemas.ts`, `src/api/cameras.ts`, `src/hooks/useCameras.ts` |
| 1 | sonnet | `src/api/invitations.ts`, `src/hooks/useInvitations.ts` |
| 2 | sonnet | `src/components/camera/LiveThumbnail.tsx`, `src/components/camera/CameraCard.tsx` |
| 2 | sonnet | `src/components/camera/CameraCardUnconfigured.tsx`, `src/pages/app/CameraMonitorPage.tsx`, `src/components/common/InviteModal.tsx` |
| 3 | sonnet | `src/pages/app/DashboardPage.tsx`, `src/data/mockData.ts` |
| 3 | sonnet | `src/pages/app/DashboardPage.test.tsx` |

`src/lib/schemas.ts` is wave-1-sonnet's alone, which is why the invitation schema is added there
rather than by the invitations agent.

## Verification

Main session runs this — not an agent's word for it (`docs/BEST_PRACTICES.md:18`).

```bash
node --version          # must be 22 — Node 20 dies with webidl.util.markAsUncloneable
pnpm add hls.js
pnpm verify             # typecheck, lint (oxfmt --check src), test, build
```

Then against a running backend, `pnpm dev` → http://localhost:8443:

1. Log in. The panel shows real cameras from `GET /cameras`; thumbnails are authenticated blobs, so
   a broken image means `useSnapshotImage` regressed, not a bad URL.
2. Ages read as computed values off `lastSnapshotAt`, not `"2 min"` on every card.
3. `Desactivar` a configured camera → it drops into the collapsed "Cámaras desactivadas" section
   and **is still there after a browser reload**. That reload is the point of the change.
4. `Configurar` on the fourth card → the monitor page opens on *that* camera, URL carries
   `?camera=<its id>`.
5. Hover an online card for half a second → video plays and the pill appears. With
   `MEDIAMTX_ENABLED` off, the snapshot stays, no pill, and the network tab shows exactly one 409
   for that camera (`retry: false`).
6. `Invitar miembro` with a real address → a row lands in the backend's `invitations` table.
7. Sidebar: only one entry highlights on `/`.
