# API Documentation

The SnookerStream API is built with Next.js Route Handlers. All paths are relative to `apps/web/app/api`.

## Authentication

### `POST /api/auth/register`
Registers a new user.
- **Body**: `{ name, email, password }`
- **Validation**: name/email/password required, password min length 8
- **Guards**: registration toggle respected, IP rate limited
- **Response**: `201 Created`

### `GET /api/auth/[...nextauth]`
NextAuth entrypoint for Google and credentials sign-in.

## Matches

### `GET /api/matches`
Fetches all matches.
- **Query Params**: `status` (optional)
- **Response**: `{ matches: IMatch[] }`

### `POST /api/matches`
Creates a match (Admin only).
- **Body**: `{ title, playerA, playerB, format, totalFrames, scheduledTime, venue, umpireId?, streamUrl?, thumbnailUrl? }`
- **Guards**: admin-only, validation, maintenance-aware, rate limited

### `GET /api/matches/[id]`
Fetches details for a specific match.

### `PATCH /api/matches/[id]`
Updates match state (Admin or assigned Umpire).
- **Body**: partial match update fields plus optional `eventLog` and optional `undoEventId`
- **Guards**: role-aware, validation, maintenance-aware, rate limited
- **Role Rules**:
  - Admins can edit scheduling, assignment, stream, and match metadata.
  - Assigned umpires can only update scoring and live status fields.
- **Response**: `200 OK`

### `DELETE /api/matches/[id]`
Deletes a match (Admin only).

### `GET /api/matches/[id]/chat`
Fetches the latest 50 chat messages for a match.

### `POST /api/matches/[id]/chat`
Creates a chat message for the authenticated user.
- **Body**: `{ text }`
- **Guards**: auth required, validation, maintenance-aware, rate limited

### `POST /api/matches/[id]/viewers`
Increments the live viewer count for a match.

### `DELETE /api/matches/[id]/viewers`
Decrements the live viewer count for a match.

## Scoring

### `POST /api/score/update`
Creates a score update event for an assigned umpire.

### `POST /api/foul/add`
Creates a foul event for an assigned umpire.

### `POST /api/frame/end`
Creates a frame-end event for an assigned umpire.

## Profile

### `PUT /api/user/profile`
Updates the logged-in user's profile.
- **Body**: `{ name?, password? }`
- **Validation**: field whitelist, password min length 8
- **Guards**: auth required, maintenance-aware
- **Response**: `200 OK`

## Admin

### `GET /api/admin/dashboard`
Returns dashboard stats, actionable matches, and recent events.

### `GET /api/admin/users`
Returns all users for admin management.

### `PATCH /api/admin/users/[id]`
Updates a user's role.

### `DELETE /api/admin/users/[id]`
Deletes a user.

### `GET /api/admin/umpires`
Returns all umpire accounts.

### `POST /api/admin/umpires`
Creates an umpire account and attempts a welcome email send.

### `GET /api/admin/settings`
Returns the single platform settings document.

### `PATCH /api/admin/settings`
Updates maintenance mode, registration toggle, and global announcement.

### `GET /api/admin/events`
Returns recent admin/match events.

### `DELETE /api/admin/events`
Clears event history.

## Public Settings

### `GET /api/settings`
Returns `{ maintenanceMode, globalAnnouncement, allowRegistration }` for public clients.

## Uploads

### `POST /api/upload`
Uploads a match thumbnail (Admin only).
- **Body**: multipart form data with `file`
- **Storage Modes**:
  - `local`: saves under `apps/web/public/uploads`
  - `external`: forwards file to `UPLOAD_EXTERNAL_ENDPOINT` and returns the remote URL

## Real-time Events (Pusher)

The system broadcasts the following events:
- **Channel**: `match-{matchId}`
  - `match-updated`: Match state changed.
  - `new-event`: Event timeline entry created.
  - `event-removed`: Event timeline entry removed by undo.
  - `new-chat-message`: Chat message created.
  - `viewer-update`: Viewer count changed.
- **Channel**: `platform-settings`
  - `settings-updated`: Public platform settings changed.
