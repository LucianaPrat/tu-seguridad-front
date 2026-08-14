# Plan: Security Monitoring App

## Context

The user provided a full product spec (`security-monitor-app.md`) and a design reference (`paulina-camaras.png`). The reference shows a professional security dashboard with a dark teal sidebar, white content area, camera grid cards with online/offline badges, and unconfigured-camera overlays. The task is to build the complete app as a React SPA with all pages from the spec, all shared reusable components, and mocked data (no real backend).

---

## Aesthetic Decisions

From the reference image:
- **Sidebar**: Dark teal (`#0f4f47`) with white text and icons; active item is a lighter teal pill (`#1a6b61`)
- **Content bg**: White `#ffffff`, page bg `#f6f8f7`
- **Accent / badges**: Emerald green `#22c55e` for "En línea", teal `#1a6b61` for primary buttons
- **Typography**: Inter (Google Fonts) — 400/500/600/700 weights; no serif
- **Cards**: White, `border border-gray-100`, `rounded-xl`, `shadow-sm`
- **All UI text**: Spanish

---

## Architecture

React Router SPA. A `SessionContext` holds mock auth state (`isLoggedIn`, `isDVRInit`, `user`) and drives route guards.

---

## File Structure

```
src/
  index.css                          — Google Font @import + Tailwind + CSS theme tokens
  App.tsx                            — BrowserRouter + SessionContext provider + route tree

  context/
    SessionContext.tsx               — isLoggedIn, isDVRInit, user, login(), logout()

  data/
    mockData.ts                      — cameras, events, members, channels mock arrays
    timezones.ts                     — ~30 IANA timezone options with UTC offset labels

  components/
    layout/
      AppShell.tsx                   — Sidebar + TopBar wrapper; wraps all authenticated pages
      Sidebar.tsx                    — Dark teal nav: Inicio, Monitoreo, Cámaras, Eventos,
                                       Grabaciones, Perfil, Notificaciones, Ayuda, Cerrar sesión
                                       + "¿Necesitás ayuda?" support card at bottom
      TopBar.tsx                     — Bell with badge, user avatar, space name dropdown

    camera/
      CameraCard.tsx                 — Thumbnail card: snapshot, En línea/Offline badge,
                                       snapshot age, camera name, location, "..." menu
                                       — Hover triggers video-stream placeholder animation
      CameraCardUnconfigured.tsx     — Greyed card with gear overlay + "Configurar" button
      CameraGrid.tsx                 — Responsive grid wrapper (4→2→1 cols)

    ui/
      Badge.tsx                      — Reusable status badge (Online/Offline/Intruso/Sospechoso)
      Button.tsx                     — Primary / secondary / ghost variants, loading state
      Modal.tsx                      — Overlay modal with title + children + action buttons
      FormField.tsx                  — Label + input + error message wrapper
      TimezoneCombobox.tsx           — Searchable IANA timezone selector (keyboard accessible)
      ContextMenu.tsx                — "..." dropdown (enable/disable, configure, etc.)
      StatusDot.tsx                  — Green/red/gray dot for online/offline/pending
      Tabs.tsx                       — Horizontal tab switcher component
      Table.tsx                      — Generic sortable table (thead + tbody + empty state)
      PageHeader.tsx                 — Page title + optional right-side action slot
      InviteModal.tsx                — Email invite modal (reused in Dashboard + MembersPage)
      ConfirmModal.tsx               — Generic "are you sure?" modal with acknowledge checkbox

    auth/
      AuthCard.tsx                   — Centered card shell used by all auth pages (logo + card)

    dvr/
      DVRForm.tsx                    — Reusable DVR fields form (space name, URL, user, pass, TZ)
                                       used in both DVRInitPage and DVRConfigPage

    zone-editor/
      ZoneEditor.tsx                 — Canvas overlay over camera image for drawing rectangular
                                       monitoring zones; returns array of {rect, alertType}
      ZoneList.tsx                   — List of drawn zones with alert-type badge + delete button

  pages/
    auth/
      LoginPage.tsx                  — Tabs: Contraseña | Magic Link | Face-Auth; links to
                                       RegisterPage and PasswordRecoveryPage
      RegisterPage.tsx               — First name, last name, email, phone, profile picture,
                                       password, repeat password; validation
      PasswordRecoveryPage.tsx       — Email field + "Enviar enlace de restablecimiento";
                                       never reveals if email exists; confirmation message
      PasswordChangePage.tsx         — New password + confirm; reached from reset link
                                       (mocked: accessible via /auth/change-password)

    onboarding/
      DVRInitPage.tsx                — Mandatory first-time onboarding; uses DVRForm;
                                       "Probar conexión" → success → Dashboard

    app/
      DashboardPage.tsx              — Configured camera section (CameraGrid + CameraCard)
                                       + Unconfigured section (collapsible, CameraCardUnconfigured)
                                       + "Invitar miembro" button → InviteModal
      DVRConfigPage.tsx              — Uses DVRForm (pre-filled); "Probar conexión";
                                       ConfirmModal before saving
      CameraMonitorPage.tsx          — Left: camera list panel. Right: camera name input,
                                       Full/Partial mode toggle, ZoneEditor (partial),
                                       alert-type selector (full), ZoneList (partial)
      EventsPage.tsx                 — Table with filters (date range + alert type checkboxes)
                                       Acknowledged column with user + timestamp metadata
      MembersPage.tsx                — Members Table (email, active status, last login)
                                       + InviteModal
      CommChannelsPage.tsx           — Section 1: alert routing checkbox grid (2 alert types × 3
                                       channels). Section 2: per-user enable/disable toggles
      ProfilePage.tsx                — Edit profile form (name, email, phone, avatar upload)
                                       + separate password change section below
```

---

## Packages to Install

- `react-router-dom` — SPA routing
- `lucide-react` — icon set matching the reference

---

## CSS Tokens (`src/index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import 'tailwindcss';

@theme inline {
  --color-sidebar:        #0f4f47;
  --color-sidebar-hover:  #1a5e55;
  --color-sidebar-active: #1a6b61;
  --color-primary:        #1a6b61;
  --color-primary-dark:   #0f4f47;
  --color-online:         #22c55e;
  --color-offline:        #ef4444;
  --color-page-bg:        #f6f8f7;
  --radius-card:          0.75rem;
}

body { font-family: 'Inter', sans-serif; background-color: #f6f8f7; }
```

---

## Route Tree

```
/login                   — LoginPage (public)
/register                — RegisterPage (public)
/auth/recover            — PasswordRecoveryPage (public)
/auth/change-password    — PasswordChangePage (public)
/onboarding/dvr          — DVRInitPage (logged in, DVR not init)
/                        — DashboardPage (authenticated + DVR init)
/dvr-config              — DVRConfigPage
/cameras/monitor         — CameraMonitorPage
/events                  — EventsPage
/members                 — MembersPage
/channels                — CommChannelsPage
/profile                 — ProfilePage
```

Route guard in `App.tsx`:
- Not logged in → `/login`
- Logged in, DVR not init → `/onboarding/dvr`
- Logged in, DVR init → app routes

---

## Key Shared Component Details

### CameraCard
- Props: `camera: Camera` (name, location, status, snapshotUrl, isConfigured, isEnabled)
- Shows snapshot image (Unsplash), "En línea" / "Offline" badge, snapshot age ("5 mins ago")
- Hover: overlay fades to a pulsing "LIVE" indicator simulating streaming
- `...` context menu: Activar / Desactivar, Configurar, Ver eventos

### DVRForm
- Props: `defaultValues?`, `onSubmit`, `onTest`
- Fields in order: Nombre del espacio, URL DVR, Usuario DVR, Contraseña DVR, Zona horaria
- TimezoneCombobox for timezone field
- Reused identically in DVRInitPage and DVRConfigPage

### ZoneEditor
- SVG/Canvas overlay on top of `<img>` of camera snapshot
- Mouse down → drag → mouse up draws a rectangle
- Each rectangle gets a label with alert type (Intruso / Sospechoso)
- Rectangles stored in local state; passed up via `onChange`

### InviteModal
- Single email input + "Enviar invitación" button
- After submit: shows confirmation "Revisá tu correo" message; never reveals registration status

### TimezoneCombobox
- Filterable list; shows "America/Argentina/Buenos_Aires — UTC-03:00" style labels
- Keyboard accessible (arrow keys + enter)
- Stores IANA identifier in form state

---

## Mock Data (`src/data/mockData.ts`)

```ts
cameras: Camera[]       — 8 cameras (4 configured+online, 4 unconfigured)
events: SecurityEvent[] — 15 events with realistic timestamps, camera refs, ack data
members: Member[]       — 5 members with email, status, last login
```

---

## Verification

1. App loads on port 8443 with no console errors
2. Public auth flow: Login → Register → Password Recovery all reachable and styled
3. After mock login → DVR Init onboarding → Dashboard
4. Dashboard: configured grid (4 cols) + collapsible unconfigured section
5. Camera hover shows "LIVE" animation
6. DVR Config: Test Connection shows loading → success/error; save triggers ConfirmModal
7. Camera Monitor: switch Full/Partial; draw zones in partial mode; zones appear in list
8. Events: date filter + alert type filter update visible rows
9. Members: invite modal opens and shows confirmation
10. Comm Channels: checkboxes and toggles are interactive
11. Profile: form is editable; password section is separate
12. Sidebar navigation works for all routes; active item highlighted
13. Responsive: sidebar collapses on < 768px; camera grid reflows
