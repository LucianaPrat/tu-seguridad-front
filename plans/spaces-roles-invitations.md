# Spaces, roles, permissions and invitations — frontend

## Context

Backend plan: `tu-seguridad-back/plans/08.spaces-roles-invitations.md` (roles table, `MenuKey`,
endpoints). Today the session carries one `spaceId/spaceName/role` (`src/lib/schemas.ts:118-131`),
role checks are `role === "admin"` scattered across pages, the sidebar has no permission field
(`src/components/layout/Sidebar.tsx:22-30`), and `/invitations/accept` auto-logs a freshly created
user. Goal: space switcher, menu/route filtering by permission, Trello-style accept/decline, admin
editing members' role/menu/cameras. UI stays Spanish.

Do not start F01 until back T03 is merged; F02 needs T04; F03 needs T05.

## Endpoints used

| Screen need | Endpoint |
|---|---|
| Session / current space | `GET /auth/me` → `spaces[]`, `currentSpace`, `pendingInvitationsCount` |
| Switch space | `POST /auth/switch-space {spaceId}` → `{accessToken}` |
| Create / rename space | `POST /spaces {name}`, `PATCH /spaces/current {name}` |
| Invitation landing | `GET /invitations/preview?token=` |
| My invitations | `GET /invitations/mine`, `POST /invitations/:id/accept`, `/decline` |
| Register from invite | `POST /auth/register {…, inviteToken}` |
| Invite | `POST /invitations {email, role, menuAccess?, cameraIds?}` |
| Pending (admin) | `GET /invitations`, `DELETE /invitations/:id`, `POST /invitations/:id/resend` |
| Members | `GET /members`, `PATCH /members/:userId`, `DELETE /members/:userId` |

## F01 — Session, permissions, switcher, menu and routes

1. `meSchema`: replace `spaceId/spaceName/role` with `spaces: {id,name,role}[]`,
   `currentSpace: {id,name,role,menuAccess,cameraIds} | null`, `pendingInvitationsCount`.
   Role enum `admin | collaborator | guest`. Update `FIXTURE_USER` (`src/stores/sessionStore.ts:32`).
2. `src/lib/permissions.ts`: `MENU_KEYS`, `useCan()` → `{ canView(key), canEdit(key), isAdmin }`
   (admin views all; edit = role in `admin|collaborator` AND `canView`). Replace every
   `role === "admin"` (`MembersPage:46`, `DashboardPage:27`, `CommChannelsPage:41,134,224`,
   `useInvitations:27`, `useOnboardingTour:246`).
3. `useSwitchSpace` / `useCreateSpace` in `src/hooks/useSpaces.ts`: on success set token →
   `me()` → `queryClient.clear()` → navigate `/`. Reuse `openSession` from `src/hooks/useAuth.ts`.
4. `SpaceSwitcher` component in sidebar header (`Sidebar.tsx:111`) and `MobileNav`: list spaces
   (name + role badge, check on current), "Crear espacio" modal, "Invitaciones (n)" link,
   "Renombrar espacio" for admin.
5. Sidebar: every item gets `key: MenuKey`; fold the hardcoded DVR/Canales/Miembros NavLinks into
   the arrays; filter with `canView`.
6. `App.tsx`: `RequireMenu` wrapper per route, redirects to first allowed item. `DVRGate`: no
   current space → `/spaces/start` (create space + my invitations); space without DVR and not
   admin → "Este espacio todavía no está configurado" screen instead of `/onboarding/dvr`.
7. Hide/disable edit controls with `canEdit`: DVR form, zone editor, camera card menu, channels
   save, event acknowledge.

**DoD:** `pnpm verify` green; tests for `permissions.ts` (each role × key); switching spaces
refreshes data and menu; guest sees only Inicio, Monitoreo, Perfil, Ayuda.

## F02 — Invitation landing, register with token, my invitations

1. Rewrite `src/pages/auth/InvitationAcceptPage.tsx`: query `preview` → card "{inviter} te invitó
   a {space} como {rol}".
   - Logged out: `userExists` → `/login?email=…&next=/invitations/accept?token=…`; else
     `/register?inviteToken=…&email=…`.
   - Logged in, same email: Aceptar (mutation → switch to space → `/`) / Rechazar.
   - Logged in, other email: "Esta invitación es para X" + Cerrar sesión.
2. `LoginPage` honours `?email` and `?next`. `RegisterPage` with `inviteToken`: fixed email, no
   space name field, sends `inviteToken`, then returns to the landing.
3. `/invitations` page (and `/spaces/start` section): list `GET /invitations/mine` with
   Aceptar / Rechazar.
4. Remove the old auto-login accept query (`useInvitations.ts:47-69`).

**DoD:** `pnpm verify` green; manual: new user from mailpit link registers → accepts → lands in
the space; existing user with another space accepts from `/invitations`.

## F03 — Invite modal and members tab

1. `InviteModal.tsx`: role select (Administrador / Colaborador / Invitado); menu checklist
   prefilled with the role default; camera checklist when guest (`GET /cameras`).
2. `MembersPage.tsx`: columns Rol and Acceso ("5/6 secciones", "3 cámaras"). Admin row action
   "Editar" → drawer: role, menu checkboxes (disabled for admin), camera checkboxes (guest only),
   recibir alertas, "Quitar del espacio" with confirm. Show backend 409 messages
   (`LAST_ADMIN`, `SELF_ROLE_CHANGE`).
3. Pending invitation rows show role and Reenviar / Revocar.
4. Non-admin with `members` access: read-only table.

**DoD:** `pnpm verify` green; manual: admin removes `events` from collaborator → collaborator's
menu loses Eventos after next `me()` refetch; guest camera change reflected in Monitoreo.
