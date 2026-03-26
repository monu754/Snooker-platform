# API Documentation

All routes below are implemented under `apps/web/app/api`.

## Health And Platform

### `GET /api/health`
- Returns service status and database reachability.
- Response: `{ success, status, timestamp, services: { database } }`

### `GET /api/metrics`
- Returns Prometheus-style metrics output for admins only.

### `GET /api/metrics?format=json`
- Returns JSON counters, histograms, uptime, and process stats for admins only.

### `GET /api/settings`
- Public settings for clients.
- Response: `{ maintenanceMode, globalAnnouncement, allowRegistration }`

## Authentication

### `GET|POST /api/auth/[...nextauth]`
- NextAuth entrypoint for Google and credentials authentication.

### `POST /api/auth/register`
- Creates a new viewer account.
- Body: `{ name, email, password }`
- Guards: registration toggle, maintenance mode, rate limit

## Profile And Subscription

### `GET /api/user/profile`
- Returns the signed-in user profile, role, favorites, and effective subscription tier.

### `PUT /api/user/profile`
- Updates the signed-in profile.
- Body: `{ name?, password?, favoritePlayers?, subscriptionTier? }`
- Notes:
  - `subscriptionTier` is only honored for normal viewer accounts.
  - admin and umpire accounts are forced to role-based access instead of premium plans.

### `POST /api/subscription/checkout`
- Starts premium checkout for a viewer account.
- Body: `{ tier }` where `tier` is `plus` or `pro`
- Behavior:
  - uses `BILLING_CHECKOUT_ENDPOINT` when configured
  - supports `ALLOW_DEV_BILLING_BYPASS=true` for local/demo upgrade flow
  - rejects admin and umpire accounts

## Push Notifications

### `GET /api/push/public-key`
- Returns the configured public VAPID key for browser push subscription.

### `GET /api/push/subscription`
- Returns whether the signed-in user currently has at least one stored push subscription.

### `POST /api/push/subscription`
- Saves or refreshes the signed-in user's browser push subscription.
- Body: `{ subscription }`

### `DELETE /api/push/subscription`
- Removes a stored browser push subscription for the signed-in user.
- Body: `{ endpoint }`

## Players

### `GET /api/players`
- Public player directory search.
- Query: `q`, `country`, `rank`

### `GET /api/admin/players`
- Admin player manager listing.

### `POST /api/admin/players`
- Creates a registered player profile.
- Body: `{ name, country?, rank?, bio? }`

### `GET /api/admin/players/[id]`
- Returns a single registered player for edit pages.

### `PATCH /api/admin/players/[id]`
- Updates a registered player profile.
- Body: `{ name, country?, rank?, bio? }`

## Matches

### `GET /api/matches`
- Returns matches, optionally filtered by `status`.

### `POST /api/matches`
- Creates a match.
- Admin only.
- Body: `{ title, playerA, playerB, format, totalFrames, scheduledTime, venue, umpireId?, streamUrl?, secondaryStreamUrls?, vodUrl?, thumbnailUrl? }`
- Rules:
  - both players must already exist in the player directory
  - Player A and Player B must be different

### `GET /api/matches/[id]`
- Returns one match plus its event log.

### `PATCH /api/matches/[id]`
- Updates match metadata or live scoring.
- Admins can edit metadata and assignments.
- Assigned umpires can only change scoring/live-state fields.
- If player fields are changed by admin, both players must already exist in the player directory.

### `DELETE /api/matches/[id]`
- Deletes a match and related chat/events.
- Admin only.

### `GET /api/matches/[id]/chat`
- Returns the latest 50 chat messages with abusive terms masked.

### `POST /api/matches/[id]/chat`
- Sends a chat message.
- Body: `{ text }`
- Guards: auth required, anti-spam validation, maintenance mode, rate limit

### `DELETE /api/matches/[id]/chat/[messageId]`
- Removes a chat message.
- Allowed for the original sender or an admin moderator.

### `POST /api/matches/[id]/viewers`
- Registers or refreshes a viewer presence session for a match.

### `DELETE /api/matches/[id]/viewers`
- Releases a viewer presence session for a match.

## Umpire Scoring

### `POST /api/score/update`
- Creates a score update event.
- Assigned umpire only.

### `POST /api/foul/add`
- Creates a foul event.
- Assigned umpire only.

### `POST /api/frame/end`
- Ends the frame and updates frame totals.
- Assigned umpire only.

### `GET /api/umpire/matches`
- Returns matches assigned to the signed-in umpire.

## Admin

### `GET /api/admin/dashboard`
- Dashboard totals, recent events, and admin overview cards.

### `GET /api/admin/events`
- Returns recent admin and match events.

### `DELETE /api/admin/events`
- Clears event history.

### `GET /api/admin/users`
- Returns all users for admin management.
- Tier values are normalized so admin/umpire accounts stay on role-based access.

### `PATCH /api/admin/users/[id]`
- Updates a user role and/or subscription tier.
- If role becomes `admin` or `umpire`, tier is reset to `free`.

### `DELETE /api/admin/users/[id]`
- Deletes a user account.

### `GET /api/admin/umpires`
- Lists umpire accounts.

### `POST /api/admin/umpires`
- Creates an umpire account and attempts to send a welcome email.

### `GET /api/admin/settings`
- Returns editable platform settings for admins.

### `PATCH /api/admin/settings`
- Updates maintenance mode, registration toggle, and announcement text.

## Viewer Features

### `GET /api/users/mentions`
- Returns mention suggestions for live chat.
- Auth required.

### `GET /api/analytics/players`
- Returns aggregate player analytics built from finished matches and events.

### `GET /api/vod`
- Returns recent completed matches with playback URLs and chapter markers.

### `GET /api/partner/live`
- Public partner/live feed of current and upcoming matches.

### `GET /api/brackets`
- Returns the generated bracket structure from current entrants.

## Uploads

### `POST /api/upload`
- Uploads a match image.
- Admin only.
- Body: multipart form data with `file`
- Storage modes:
  - `local`
  - `external`
  - `object` using `UPLOAD_OBJECT_ENDPOINT` and `UPLOAD_OBJECT_PUBLIC_BASE_URL`

## Real-Time Events

### Channel `match-{matchId}`
- `match-updated`
- `new-event`
- `event-removed`
- `new-chat-message`
- `chat-message-deleted`
- `viewer-update`

### Channel `platform-settings`
- `settings-updated`
