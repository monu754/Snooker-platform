# API Documentation

The SnookerStream API is built with Next.js Route Handlers. All paths are relative to `apps/web/app/api`.

## Authentication

### `POST /api/auth/register`
Registers a new user.
- **Body**: `{ name, email, password }`
- **Response**: `201 Created`

## Matches

### `GET /api/matches`
Fetches all matches.
- **Query Params**: `status` (optional)
- **Response**: `{ matches: IMatch[] }`

### `GET /api/matches/[id]`
Fetches details for a specific match.

### `PUT /api/umpire/matches/[id]`
Updates match score or status (Umpire only).
- **Body**: `{ scoreA, scoreB, status, activePlayer, ... }`
- **Response**: `200 OK`

## Profile

### `PUT /api/user/profile`
Updates the logged-in user's profile.
- **Body**: `{ name?, password? }`
- **Response**: `200 OK`

## Real-time Events (Pusher)

The system broadcasts the following events:
- **Channel**: `match-{matchId}`
  - `score-update`: Triggered when scores change.
  - `status-change`: Triggered when status changes (e.g., live -> paused).
  - `chat-message`: Triggered when a new message is sent.
