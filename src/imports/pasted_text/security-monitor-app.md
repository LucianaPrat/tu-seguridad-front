# Product Summary

Security monitoring UI.

Main functions:

* Monitor security events through WebSocket.
* Show non-continuous camera video streaming from DVR.
* No SEO requirements.
* No SSR requirements.
* No complex frontend business logic.
* No extreme rendering-performance requirements.

## Frontend Stack

* React 19
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* TanStack Query for REST data and server cache
* Zustand for global client state
* React Router for routing
* react-hook-form + Zod for forms and validation
* Vitest + React Testing Library for tests
* pnpm as package manager

Do not use:

* Next.js
* Redux
* Bootstrap
* CSS-in-JS
* Unnecessary performance optimization

Reason: product does not need SEO, SSR, or high frontend complexity.

---

# Main Menu

Show:

* Dashboard
* DVR Configuration
* Camera Monitor Behavior
* Events
* Communication Channels
* Space Members

---

# Authentication

Use standard JWT authentication.

Backend provides authentication endpoint.

User sends:

* Email
* Password

Backend returns:

* Access token
* Refresh token

Use typical JWT access-token + refresh-token flow.

## Login with Username and Password

Standard login form.

Fields:

* Email
* Password

Username = registered email address.

Validate email syntax before submit.

On successful authentication:

* Receive access token.
* Receive refresh token.
* Store authenticated session.
* Use access token for authenticated API requests.
* Use refresh token to obtain new access token when required.

## Login with Magic Link

User enters email address.

UI contains:

* Email field
* `Send Magic Link` button
* Instruction telling user to check email after submit

Behavior:

1. User enters email.
2. UI requests magic-link email from API.
3. If email exists, API sends magic link.
4. UI must never reveal whether email is registered.
5. User clicks magic link.
6. API handles token/link validation and authentication.
7. User becomes automatically logged in.

Email sending and magic-link authentication are API responsibilities.

## Login with Face-Auth

Use `face-auth` package.

For MVP:

* Add authentication button similar to Magic Link button.
* Button label: `Login with Face-Auth`
* Full Face-Auth wizard integration can come later.

## Logout

Standard logout flow.

Clear authenticated session and token state.

## Register

Registration requires:

* First name
* Last name
* Email address
* Mobile phone
* Profile picture
* Password
* Repeat password

Validate password confirmation.

## Password Recovery

User enters email address.

UI contains:

* Email field
* `Send Reset Link` button
* Instruction telling user to check email

Behavior:

1. User enters email.
2. UI requests password-reset email from API.
3. If email exists, API sends reset link.
4. UI must never reveal whether email is registered.
5. User clicks reset link.
6. Link opens password-change UI.
7. API handles reset-link validation and password update flow.

Email sending and reset-link processing are API responsibilities.

## Edit Profile

User can edit:

* First name
* Last name
* Email address
* Mobile phone
* Profile picture

Same page also contains separate password-change section.

---

# Business Features

## DVR Initialization

After registration, user cannot access Dashboard immediately.

DVR initialization is mandatory first-time onboarding.

Fields, in this order:

1. Space name
2. DVR URL
3. DVR username
4. DVR password
5. DVR timezone

`Space name` must be first field in UI.

### DVR Timezone

Use a searchable timezone selector.

Preferred UI:

* shadcn/ui Combobox
* Searchable
* Keyboard accessible
* Show human-readable timezone
* Show UTC offset when useful
* Store standard IANA timezone identifier when possible

Example options:

* `America/New_York — UTC-04:00`
* `America/Chicago — UTC-05:00`
* `America/Argentina/Buenos_Aires — UTC-03:00`
* `Europe/Madrid — UTC+02:00`

Do not use a free-text timezone input.

### Initialization Flow

1. User enters Space name.
2. User enters DVR connection data.
3. User selects DVR timezone.
4. System tests DVR connection/configuration.
5. If test succeeds, save configuration.
6. Redirect user to Dashboard.
7. If test fails, show error.
8. Ask user to correct configuration.
9. Do not allow Dashboard access until initialization succeeds.

Saved initialization values can later be edited from `DVR Configuration`.

---

# DVR Configuration

Menu item.

Allows editing:

1. Space name
2. DVR URL
3. DVR username
4. DVR password
5. DVR timezone

Keep `Space name` as first field.

Use same searchable timezone selector used during DVR Initialization.

## Test DVR Connection

Provide explicit action:

`Test Connection`

Behavior:

1. User enters or modifies DVR configuration.
2. User clicks `Test Connection`.
3. UI sends current configuration to API.
4. Show loading state while testing.
5. Show clear success state if DVR connection works.
6. Show clear error state if DVR connection fails.
7. Do not require saving configuration just to test connection.

Before saving changed DVR configuration, warn user:

Changing DVR configuration can cause existing per-camera configurations to be lost.

Require explicit acknowledgement before save.

---

# Dashboard

Dashboard shows all cameras returned by DVR/API.

Use compact camera cards/thumbnails.

Display multiple cameras in rows and columns.

Purpose: fast visual overview of camera status.

## Camera Card

Each camera shows:

* Latest camera snapshot
* Camera name
* Online/Offline state
* Configuration state

Status badge:

* `Online`
* `Offline`

Status comes from API.

If camera is online, show snapshot age.

Examples:

* `5 mins ago`
* `1 hr ago`

Age means time since displayed snapshot was captured.

## Live Preview on Hover

Default state = static snapshot.

When user hovers camera card:

* Switch card to real-time video streaming.
* Stream stays inside thumbnail/card.
* Stop/revert when hover ends.

Streaming is not permanently active for every camera.

## Camera Configuration State

Every camera needs monitor-behavior configuration.

If camera is not configured:

* Show clear badge or overlay.
* Make unconfigured state obvious.

## Enable / Disable Cameras

User can activate or deactivate cameras.

Disabled cameras:

* Do not disappear.
* Show in separate collapsed section below active cameras.
* Section can be expanded.

## Invite Members

Dashboard contains discreet `Invite Member` button.

On click:

1. Navigate to Space Members area.
2. Open invite modal automatically.
3. Modal asks for email address.
4. User sends invitation.
5. API sends invitation email.
6. Invited person clicks magic link.
7. API creates new user and associates user with this space.
8. Magic link automatically logs invited user in.
9. First screen shown is profile/registration completion UI.
10. Invited user completes required registration data.
11. User cannot access Dashboard until registration data is completed.

---

# Camera Monitor Behavior Configuration

Configure monitoring behavior for each camera.

User can set custom camera name.

Configuration is performed directly over captured still image from camera.

Each camera supports two monitoring modes:

* Full
* Partial

## Full Monitoring

Entire image is monitored.

Any detected event anywhere in image generates alert.

Alert types:

* Intruder
* Suspicious

## Partial Monitoring

User defines one or more monitored regions over camera snapshot.

For each region:

1. Draw/select area on image.
2. Assign alert type:

   * Intruder
   * Suspicious

Multiple regions allowed.

Different regions can have different alert types.

Example:

* Region A → Intruder
* Region B → Suspicious
* Region C → Intruder

UI must visually show:

* Selected regions
* Region boundaries
* Assigned alert type

---

# Events

Show historical security events.

An event contains:

* Camera
* Alert type
* Communication channel used
* Event timestamp
* User acknowledgment status

An event represents a camera alert sent through configured communication channel.

## User Acknowledgment

Add dedicated `Acknowledged` column.

Purpose:

* Indicate whether recipient received and saw alert.

Possible states:

* `Acknowledged`
* `Not acknowledged`

When acknowledged, also show useful metadata when available:

* User who acknowledged alert
* Acknowledgment timestamp

Example:

`Acknowledged by John Smith · 10:42 AM`

If no acknowledgment:

`Not acknowledged`

## Event Filters

Provide filters for:

* Date
* Alert type:

  * Intruder
  * Suspicious

---

# Space Members

Show users associated with current space.

For each user show:

* Email
* Active status
* Last login

Also show `Invite Member` button.

Invite flow:

1. Enter email.
2. Send invitation.
3. Invitation email contains magic link.
4. Invited user clicks link.
5. User is created and associated with current space.
6. User is automatically authenticated.
7. User must complete registration/profile information before Dashboard access.

---

# Configuration

## Communication Channels

Configure how alerts are delivered.

Supported channels:

* Phone call
* WhatsApp
* Email

Configuration has two parts.

### Alert Routing

For each alert type, select communication channels.

Alert types:

* Intruder
* Suspicious

Channels:

* Phone call
* WhatsApp
* Email

Allow one or multiple channels per alert type.

### Alert Recipients

Show registered users.

For each user, allow enabling/disabling alert reception.

Use data already stored in user profile:

* Email for email alerts
* Mobile phone for phone-call alerts
* Mobile phone for WhatsApp alerts

Only enabled users receive alerts.
