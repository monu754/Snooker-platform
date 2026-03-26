# Snooker Platform Feature Audit And Test Cases

Date: 2026-03-26

## What Was Reviewed

This audit compares the codebase against the uploaded report and the current route/model/page wiring in `apps/web`.

The review focused on:

- authentication and registration
- RBAC and middleware
- admin match management
- umpire flows
- player directory and favorites
- live watch page, chat, and viewer presence
- settings enforcement
- production-readiness items called out in the report

## Implemented Or Confirmed Working In Code

- Google + credentials authentication
- role-based access checks in middleware and protected APIs
- credential registration flow
- profile update flow
- admin dashboard and recent event logging
- match creation
- match deletion
- match status updates
- umpire directory and umpire creation
- user management routes/pages
- public player directory
- live match watch page with chat and viewer presence
- maintenance mode checks on registration, profile updates, uploads, match changes, umpire creation, and chat posting
- registration toggle enforcement for public sign-up

## Fixed In This Pass

- Added a real admin add-player workflow instead of relying only on implicit upsert edits.
- Split player creation and player update behavior in the admin player API to avoid duplicate-name and rename conflicts.
- Added server-side player profile validation for name, country, rank, and bio.
- Reworked the admin player area into a true player manager with a dedicated create page, dedicated edit page, action buttons, and full player detail visibility.
- Moved the player create entry point into the player manager toolbar so it behaves like the other admin manager screens.
- Switched admin match creation and edit flows from free-text player names to registered-player dropdowns backed by the player directory.
- Enforced on the server that both match players must already exist in the player directory before a match can be created or saved.
- Added protection to stop the same registered player from being assigned as both Player A and Player B.
- Strengthened chat abuse filtering using the text file at `apps/web/lib/chat-abusive-words.txt`.
- Expanded moderation matching to catch common obfuscations like `b1tch` and `f*ck`.
- Ensured abusive words are masked as `****` before storage/return in chat flows.
- Added visible chat error handling on the watch page for rate limits, maintenance, auth, and validation failures.
- Scoped chat post rate limits to the signed-in user identity when available.
- Fixed favorite-player count syncing so removed favorites no longer leave stale counts behind.
- Added automated tests for player validation and abusive-word masking.
- Added a centralized schema rules layer in `apps/web/lib/schemas.ts` so request validation constraints live in one place.
- Added role-aware premium access rules so only viewer accounts can buy premium tiers; admin and umpire accounts keep role-based access without premium plans.
- Added a premium checkout endpoint and account UI entry point for buying Plus/Pro viewer plans.
- Added health monitoring at `/api/health` and alert webhook fan-out from structured warning/error logs.
- Expanded CI to run across multiple supported Node versions.
- Added deployment support for a local/server app stack with `docker-compose.yml`.
- Updated upload strategy support so object-storage style configuration is first-class.
- Refreshed API and architecture documentation to match current endpoints, flows, and operational hooks.
- Added automated tests for access control and premium tier validation.

## Report Items That Are Present But Looked Misclassified

- `Full match editing workflow (players/date/format edit UI)` is present in code at the admin edit match page and PATCH route, even though the report marked it pending.

## Still Pending Or Not Fully Production-Ready

These are still not fully complete:

- broad automated integration/e2e coverage beyond the current unit and route-support tests
- full cloud IaC beyond Docker, Vercel config, and local compose deployment
- repo-wide lint cleanup: the app still has many existing warnings outside the files touched here

## Recommended Manual Test Cases

### Authentication And Settings

1. Register a normal user while `allowRegistration=true` and `maintenanceMode=false`.
Expected: account is created and sign-in works.

2. Disable registration in admin settings and retry register.
Expected: page disables registration actions and API returns `403`.

3. Enable maintenance mode and retry register, profile update, upload, chat post, and match update.
Expected: each blocked route returns a maintenance error.

4. Open `GET /api/health` while the database is available.
Expected: `200` with `status=ok`.

### Admin Player Management

1. Open the player manager and use `Create Player`.
Expected: a dedicated create page opens.

2. Add a brand-new player with name, country, rank, and bio.
Expected: player is created and appears in the manager list and public `/players` page.

3. Try to add another player with the same normalized name.
Expected: API rejects with duplicate-player error.

4. Open an existing player using the edit action.
Expected: a dedicated edit page opens with current player details prefilled.

5. Edit an existing player name/rank/country/bio and save.
Expected: record updates without creating a duplicate.

### Chat Abuse Protection

1. Post a clean message.
Expected: message appears normally.

2. Post messages containing words from `apps/web/lib/chat-abusive-words.txt`.
Expected: each abusive term is replaced with `****`.

3. Post common obfuscations such as `b1tch` or `f*ck`.
Expected: they are masked to `****`.

4. Spam repeated uppercase/repeated-token messages.
Expected: validation rejects spammy input.

5. Send many messages quickly from one account.
Expected: rate limiting returns `429` and the UI shows a notice.

### Favorite Players

1. Follow a player from `/players`.
Expected: profile stores the favorite and the player follower count increases.

2. Unfollow the same player.
Expected: follower count decreases correctly and does not remain stale.

### Match Admin Flows

1. Open create match with no players registered.
Expected: the page shows empty player dropdowns and a clear path to create players first.

2. Create at least two players in the player manager, then open create match.
Expected: both Player A and Player B are chosen from dropdowns populated from the directory.

3. Try to assign the same player on both sides.
Expected: UI discourages it and API rejects it.

4. Create a match with registered players, schedule, venue, umpire, stream URL, and thumbnail.
Expected: match saves successfully.

5. Edit the same match from the admin edit page.
Expected: player/date/format/venue/umpire/stream/thumbnail changes persist, but only registered players can be selected.

6. Delete the match.
Expected: match and related events/chat are removed.

### Premium And Role Access

1. Sign in as a normal viewer and open the profile page.
Expected: Plus and Pro purchase cards are visible.

2. Start premium checkout for `plus` or `pro`.
Expected: checkout starts through the configured billing endpoint, or through dev bypass when enabled.

3. Sign in as an admin or umpire and open the profile page.
Expected: premium purchase UI is hidden and role-based access messaging is shown instead.

4. Change a user role from `user` to `admin` or `umpire` in admin user management.
Expected: tier resets to `free` and the UI shows `Included in role access`.

5. Open multi-stream as viewer, umpire, and admin.
Expected: viewers are limited by tier while umpire/admin get full role-based stream access.

## Automated Checks Run

- `node --test tests/**/*.test.ts` from `apps/web`: passed
- `npx tsc --noEmit` from `apps/web`: passed
- `npx eslint .` from `apps/web`: completed with many pre-existing warnings across the repository

## Files Most Relevant To This Pass

- `apps/web/app/admin/players/page.tsx`
- `apps/web/app/admin/players/create/page.tsx`
- `apps/web/app/admin/players/[id]/edit/page.tsx`
- `apps/web/app/admin/players/player-form.tsx`
- `apps/web/app/api/admin/players/route.ts`
- `apps/web/app/api/admin/players/[id]/route.ts`
- `apps/web/app/admin/matches/create/page.tsx`
- `apps/web/app/admin/matches/[id]/edit/page.tsx`
- `apps/web/app/api/matches/[id]/chat/route.ts`
- `apps/web/app/api/matches/route.ts`
- `apps/web/app/api/matches/[id]/route.ts`
- `apps/web/app/api/subscription/checkout/route.ts`
- `apps/web/app/api/health/route.ts`
- `apps/web/app/watch/[id]/page.tsx`
- `apps/web/app/profile/page.tsx`
- `apps/web/app/admin/users/page.tsx`
- `apps/web/app/api/admin/users/[id]/route.ts`
- `apps/web/app/api/admin/users/route.ts`
- `apps/web/app/multi-stream/page.tsx`
- `apps/web/lib/access.ts`
- `apps/web/lib/chat-moderation.ts`
- `apps/web/lib/chat-abusive-words.txt`
- `apps/web/lib/subscriptions.ts`
- `apps/web/lib/schemas.ts`
- `apps/web/lib/logger.ts`
- `apps/web/lib/upload-storage.ts`
- `apps/web/lib/player-profiles.ts`
- `apps/web/lib/validation.ts`
- `apps/web/tests/access.test.ts`
- `apps/web/tests/validation.test.ts`
