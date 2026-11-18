# Members area — real roster, invitation end to end

## Context

`src/pages/app/MembersPage.tsx` renders five fixture rows out of `src/data/mockData.ts`. The screen
looks finished and is not: the count, every name, every "Activo" badge and every "Último acceso" is
invented. `ui.md:113` asks for the space users with email, active flag and last login; `ui.md:95`
asks for the invite flow behind the button.

The invite button itself is already real — `InviteModal` → `useCreateInvitation` → `POST /invitations`
works against the backend. What is missing is everything on either side of it:

- the roster the screen exists to show (`GET /members`, served since backend PR #57),
- the link the invitation email delivers. The mail points the invitee at
  `${APP_BASE_URL}/invitations/accept?token=…` — a **frontend route that does not exist**, so today
  every invitation dead-ends on a 404,
- the "completá tus datos" screen. An accepted invitation creates a user with `profileCompleted:
  false`, and the backend's global `ProfileCompletedGuard` answers **403 on every protected route**
  until `POST /auth/complete-profile` succeeds. With no such screen the invitee logs in and gets the
  `DVRUnavailable` dead end (only exit: logout).

Backend review: **nothing is missing on the API side** for this scope.

| What the screen needs | Endpoint | Status |
|---|---|---|
| roster | `GET /members` | exists, any member, 403 if own profile incomplete |
| pending invitations | `GET /invitations` | exists, **admin only** |
| invite | `POST /invitations` | exists, admin only, already used |
| accept link | `POST /invitations/accept` | exists, **public**, `{token}` → `{accessToken}` + refresh cookie |
| finish registration | `POST /auth/complete-profile` | exists, reachable with an incomplete profile |
| session identity | `GET /auth/me` | exists, already returns the full profile the front throws away |

Gaps that stay gaps (no work requested, no backend change asked for): no `DELETE`/`PATCH /members/:id`,
no role change, no cancel/resend invitation. The roster is read-only, so the screen is a table and
nothing more.

Intended outcome: an operator sees the real roster plus who has been invited and not yet joined; an
invited person clicks the emailed link, lands on a form, fills name/phone/password and arrives on the
dashboard.

## Contract, exact

```
GET  /members                → { items: MemberDto[], total }        MemberDto = { id: number, email,
     firstName, lastName, phone, avatarUrl: string|null, isActive, profileCompleted,
     lastLoginAt: string|null }   // no role per member, no pagination
GET  /invitations            → { items: [{ id, email, expiresAt, createdAt }], total }   // pending only, admin
POST /invitations/accept     public, { token } → { accessToken }     401 replayed/expired, 409 already in a space
POST /auth/complete-profile  bearer, { firstName, lastName, phone, password, avatarUrl? } → { accessToken }
                             phone must match /^\+[1-9]\d{7,14}$/, password 12–128, 409 if already completed
GET  /auth/me                → { id, email, firstName, lastName, phone, avatarUrl, isActive,
                                 profileCompleted, spaceId, spaceName, role: "admin"|"member", receiveAlerts }
```

## Decisions

1. **The profile gate lives in `DVRGate`, not in a fourth wrapper.** Every app route already passes
   through it and it already owns "logged in?". One line before the DVR fork covers all seven routes.
2. **`useDvr` stops firing for an incomplete profile.** Otherwise the gate's own query 403s and
   flashes `DVRUnavailable` before the redirect lands.
3. **`/onboarding/profile` mirrors `/onboarding/dvr`** — same directory, guarded by itself rather than
   by `RequireDVR` (which would bounce it straight back). It renders inside the existing `AuthCard`
   rather than a hand-rolled card: `RegisterPage` already puts a five-field form in one, and this form
   is the same shape.
4. **`/invitations/accept` is the accept route**, matching the path the backend's mail template already
   builds. Changing the mail map instead would be a backend commit for nothing.
5. **No new dependency, no new primitive.** Pending rows and incomplete profiles reuse
   `Badge variant="unconfigured"` with a `label` override, so `Badge.tsx` is untouched.
6. **`SessionUser` becomes `MeResponse`.** The store stops fabricating names. `login()` — the fixture
   path register and Face-Auth still use, neither has an endpoint — keeps one explicit `FIXTURE_USER`
   with `profileCompleted: true`, so those demos and the existing `App.test.tsx` cases stay green.
7. **The 12-character minimum lands only on the new schema.** `strongPassword` (min 8) is shared with
   register and password-change, both still fixtures; widening it there is unrelated churn.

## Work, in order

### 1. `src/lib/schemas.ts`

- Expand `meSchema` to the full `MeDto` above. `role: z.enum(["admin", "member"])` — the page branches
  on it, so drift should fail at the boundary like `cameraResponseSchema.status` does.
- Add, next to `invitationResponseSchema`:
  ```ts
  export const memberResponseSchema = z.object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    avatarUrl: z.string().nullish(),
    isActive: z.boolean(),
    profileCompleted: z.boolean(),
    lastLoginAt: z.string().nullish(),
  })
  export type MemberResponse = z.infer<typeof memberResponseSchema>

  export const memberListResponseSchema = z.object({
    items: memberResponseSchema.array(),
    total: z.number(),
  })
  export const invitationListResponseSchema = z.object({
    items: invitationResponseSchema.array(),
    total: z.number(),
  })
  ```
- Add the form schema (mirrors `CompleteProfileDto`, so a bad phone is a field error instead of a 400):
  ```ts
  export const completeProfileSchema = z
    .object({
      firstName: required(),
      lastName: required(),
      phone: z
        .string()
        .regex(/^\+[1-9]\d{7,14}$/, "Usá formato internacional, ej +5491122334455"),
      password: z.string().min(12, "Mínimo 12 caracteres"),
      repeatPassword: z.string(),
    })
    .refine((values) => values.password === values.repeatPassword, {
      message: "Las contraseñas no coinciden",
      path: ["repeatPassword"],
    })
  export type CompleteProfileValues = z.infer<typeof completeProfileSchema>
  ```

### 2. Data layer — follow `src/api/cameras.ts` + `src/hooks/useCameras.ts` exactly

New `src/api/members.ts`:
```ts
export async function listMembers(): Promise<MemberListResponse>   // memberListResponseSchema.parse(await request<unknown>("/members"))
```

New `src/hooks/useMembers.ts`:
```ts
export const memberKeys = { list: ["members", "list"] as const }
export function useMembers()   // useQuery, enabled: isLoggedIn
```

`src/api/invitations.ts` — two additions beside `createInvitation`:
```ts
export async function listPendingInvitations(): Promise<InvitationListResponse>  // GET /invitations
export async function acceptInvitation(token: string): Promise<string>           // POST /invitations/accept, auth: false, returns accessToken
```

`src/api/auth.ts` — one addition, same shape as `login`:
```ts
export async function completeProfile(values: {
  firstName: string
  lastName: string
  phone: string
  password: string
}): Promise<string>   // POST /auth/complete-profile → accessTokenSchema.parse(...).accessToken
```

`src/hooks/useInvitations.ts`:
```ts
export const invitationKeys = { pending: ["invitations", "pending"] as const }

export function usePendingInvitations()  // enabled: role === "admin" — the route is admin-only, so a
                                         // member would get a 403 nobody renders
export function useAcceptInvitation()    // body of useLogin with a token instead of credentials:
                                         // setAccessToken(await acceptInvitation(token)) → me() →
                                         // setSession(profile) → return profile; logout() and rethrow on failure
```
`useCreateInvitation` grows `onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.pending })`
and its "nothing to invalidate" comment goes.

`src/hooks/useAuth.ts`:
```ts
export function useCompleteProfile()  // setAccessToken(await authApi.completeProfile(values)) → me() →
                                      // setSession(profile). The claims changed, so the new token has to
                                      // replace the old one before me() runs.
```

`src/hooks/useDvr.ts` — second selector beside the existing one, same style:
```ts
const isLoggedIn = useSessionStore((state) => state.isLoggedIn)
const profileCompleted = useSessionStore((state) => state.user?.profileCompleted === true)
// ...
enabled: isLoggedIn && profileCompleted,
```
Nothing invalidates this afterwards: `useCompleteProfile` flips the store flag, the query enables
itself on the next render and the gate resolves. A disabled query stays `isPending` forever, which is
why the gate's redirect has to sit **above** its `isPending` check.

### 3. `src/stores/sessionStore.ts`

- `export type SessionUser = MeResponse`; drop `extends Member` and the `mockData` imports.
- `setSession: (profile) => set({ authStatus: "ready", isLoggedIn: true, user: profile })` — no merge,
  no `String(profile.id)` cast.
- Replace `MOCK_USER` with a `FIXTURE_USER: SessionUser` literal (same display values, `role: "admin"`,
  `profileCompleted: true`, `avatarUrl: null`), used only by `login()`. Comment states it survives only
  because register and Face-Auth have no endpoint yet.
- `DVRInitPage`'s `updateUser({ spaceName })` still typechecks and still wins locally over `/auth/me`
  until a space-rename endpoint exists — leave it, note it.

### 4. `src/App.tsx`

- Inside `DVRGate`, read `user` from the store and add, immediately after the `isLoggedIn` check:
  ```tsx
  if (user && !user.profileCompleted) return <Navigate to="/onboarding/profile" replace />
  ```
- Two new routes: public `/invitations/accept` → `InvitationAcceptPage`, and `/onboarding/profile` →
  `CompleteProfilePage` with **no** gate wrapper.

### 5. `src/pages/auth/InvitationAcceptPage.tsx` (new)

Reads `?token=` with `useSearchParams`, fires `useAcceptInvitation()` once from an effect behind a
`useRef` flag — `main.tsx` mounts `React.StrictMode`, effects run twice in dev, and the token is
single-use, so an unguarded call spends it and shows a 401 on the second pass.

Four states, one screen (`AuthCard`, like the other auth pages): no token → "Enlace inválido" plus a
link to `/login`; pending → "Validando tu invitación…"; error → `ApiError.status === 401` "El enlace ya
se usó o venció, pedí una invitación nueva", `409` renders the backend message, anything else the
generic copy; success → `<Navigate to={profileCompleted ? "/" : "/onboarding/profile"} replace />`
(an already-registered invitee joining a space skips the form).

### 6. `src/pages/onboarding/CompleteProfilePage.tsx` (new)

`AuthCard title="Completá tu perfil" subtitle="…"` wrapping the form, exactly like `RegisterPage`.
`useForm` + `zodResolver(completeProfileSchema)`, `noValidate`, `FormField` per field (nombre, apellido,
teléfono, contraseña, repetir), submit button driven by `formState.isSubmitting`, `useCompleteProfile()`
on submit, `navigate("/")` on success. Self-guards: not logged in → `/login`; `user.profileCompleted`
already true → `/`. Error line above the form reuses the `role="alert"` pattern from
`DVRInitPage`/`InviteModal`.

### 7. `src/pages/app/MembersPage.tsx` (rewrite the body, keep the shell)

`useMembers()` + `usePendingInvitations()`. `PageHeader` subtitle reads `${total} usuarios registrados`
from the response. Header, action button and `InviteModal` wiring stay as they are.

- pending → skeleton-free "Cargando miembros…" line inside the card (matches how the app handles
  pending elsewhere: nothing fancy).
- error → `role="alert"` line, `ApiError.message` with a generic fallback.
- empty → "Todavía no hay miembros" row.
- member row: avatar or initials; when `firstName` and `lastName` are both empty (an accepted invitation
  that never finished) the name cell falls back to the email and gets
  `<Badge variant="unconfigured" label="Perfil incompleto" />`; `isActive` keeps the existing
  `active`/`inactive` badge; `lastLoginAt === null` renders "Nunca".
- pending-invitation rows render after the members, from a second `.map()` over
  `invitations.items` — no synthetic `Member` objects. Email in the email column,
  `<Badge variant="unconfigured" label="Pendiente" />` in Estado, `Expira ${formatDate(expiresAt)}` in
  the last column.
- keep the local `formatDate`; `src/lib/time.ts` only exports `relativeTime`, which is not what this
  column shows.

`src/data/mockData.ts` keeps `Member`/`MEMBERS` — `CommChannelsPage` still reads them. Members' own
import goes.

### 8. Tests

Existing files that **must** be updated (they encode the old `meSchema`):
- `src/api/auth.test.ts` — the `me` fixture needs the full `MeDto`, and the "rejects a drifted payload"
  case still has to reject.
- `src/stores/sessionStore.test.ts` — `setSession` cases pass a full profile and assert the user is the
  profile, not a merge; `spaceName` now comes from the payload.
- `src/App.test.tsx:106` — the bootstrap case's `/auth/me` fixture is the old three-field shape; with a
  stricter `meSchema` it would throw at the boundary and drop the session to the login screen. Give it
  the full profile with `profileCompleted: true`.

New, minimum set:
- `src/pages/app/MembersPage.test.tsx` — admin: roster rows render from `GET /members` and a pending row
  renders from `GET /invitations`; member (`role: "member"`): only one fetch, no `/invitations` call.
- `src/pages/auth/InvitationAcceptPage.test.tsx` — valid token posts `{token}` to
  `/invitations/accept` exactly once and lands on the complete-profile form; a 401 renders the
  "ya se usó o venció" message.
- `src/pages/onboarding/CompleteProfilePage.test.tsx` — a short password and a phone without `+` are
  blocked by the resolver (no fetch); a valid submit posts the four fields.
- `src/App.test.tsx` — one case: logged in with `profileCompleted: false` on `/` lands on the
  complete-profile screen and fires no `GET /dvr`.
- `src/lib/schemas.test.ts` — `completeProfileSchema`: phone regex, 12-char minimum, mismatch path.

Conventions: `mockFetchSequence`, `renderWithProviders({ route })`, `useSessionStore.setState(...)` in
`beforeEach` (fixtures include the new `user` fields).

One exception: `MembersPage` fires two queries from the same render, so `mockFetchSequence`'s ordered
queue is a race waiting to happen. In that file stub fetch with a `vi.fn()` that branches on the URL
(`url.includes("/members")` / `"/invitations"`) and returns a fresh `Response` — the "no `/invitations`
call for a member" assertion reads off the same mock.

## Verification

```bash
source ~/.nvm/nvm.sh && nvm use 22 && \
  npm_config_manage_package_manager_versions=false \
  node /home/daniel/.nvm/versions/node/v20.19.6/lib/node_modules/pnpm/bin/pnpm.cjs verify
```

End to end, against `tu-seguridad-back` on `develop` with mailpit up and `MAIL_ENABLED=true`,
`APP_BASE_URL` pointing at the Vite origin:

1. Log in as an admin → `/members` shows the real roster, count matches `total`.
2. "Invitar miembro" with a fresh address → 201, modal confirms, a "Pendiente" row appears without a
   reload.
3. Open the mail in mailpit, follow the link in a **private window** → the accept screen resolves and
   the complete-profile form appears; no dashboard, no `DVRUnavailable`.
4. Submit name / apellido / `+5491122334455` / a 12-char password → dashboard renders, TopBar shows the
   real name, `/members` now lists that person and the pending row is gone.
5. Reload the accept link → "El enlace ya se usó o venció".
6. As that new (non-admin) member, `/members` renders the roster with no invite-related request in the
   network tab.

## Out of scope / debt to name, not fix

- `POST /auth/register` exists and `RegisterPage` still fakes a session through `login()`. Wiring it
  needs a `spaceName` decision (register creates the space; the DVR wizard also asks for it), so it
  stays out.
- `strongPassword` is still `min(8)` while the backend wants 12 on register, reset and change-password.
- `ProfilePage` still saves to the store only; `PATCH` for the own profile is not part of this scope.
- `updateUser({ spaceName })` in `DVRInitPage` remains a local override of `/auth/me`.
- No cancel/resend for a pending invitation, and no member deactivation — neither endpoint exists.

## What changed while implementing

Four deviations, all found by driving the real backend and a real browser:

1. **`useAcceptInvitation` is a query, not a mutation.** `mutate()` from an effect stalls at
   `pending` forever under `React.StrictMode`: the first mount starts the mutation, the simulated
   remount detaches that observer, and the result never reaches the live one. The screen sat on
   "Validando tu invitación…" with `POST /invitations/accept` and `GET /auth/me` both answering 200.
   A query keyed by the token dedupes the double mount instead — one request, one cached result — so
   the `useRef` guard the plan called for is gone with it. `staleTime`/`gcTime` are `Infinity` and
   `retry` is off, because a refetch of a spent token could only ever answer 401.
2. **The invite button is admin-only.** `POST /invitations` is `@Roles(admin)`, so a member's button
   could only ever 403. Hidden in `MembersPage` and `DashboardPage` off `user.role`.
3. **A row with no profile reads "Sin nombre", not the email.** The email column already identifies
   it; printing the address twice per row looked like a rendering bug.
4. **The pending row says "Invitación pendiente".** "Invitación enviada" collided with the modal's
   own success copy.

Verified end to end against `tu-seguridad-back` on `develop` (mailpit on 1025/8025, `MAIL_ENABLED=true`):
invite → mail → accept → 403 on `/members` while incomplete → complete-profile → roster with the new
member → replayed link answers 401. The three live response bodies were also parsed through
`meSchema`, `memberListResponseSchema` and `invitationListResponseSchema`.

Two environment notes, not code: `APP_BASE_URL` is `http://localhost:5173` while `pnpm dev` serves
8443 unless `$PORT` says otherwise, so the emailed link needs `PORT=5173 pnpm dev`; and the dev
database now carries the accounts these runs created, which no endpoint can delete.
