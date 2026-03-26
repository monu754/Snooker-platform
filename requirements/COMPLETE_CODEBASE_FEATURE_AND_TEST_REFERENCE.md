# Complete Codebase Feature And Test Reference

Date: 2026-03-26

Workspace: `E:\Project\Snooker\snooker-platform`

This file is a complete practical reference for the current codebase. It explains:

- what is present in the repository
- what each feature is supposed to do
- what is still missing or only partial
- what VOD is used for
- test cases that should be checked feature by feature

---

## 1. Repository Structure

### Root Level

- `apps/web`
  - Main product application built with Next.js App Router
- `packages`
  - Shared workspace packages such as UI, TS config, and ESLint config
- `infra/terraform`
  - Infrastructure-as-code baseline for AWS-style deployment
- `requirements`
  - Product, architecture, API, runbook, and audit documentation
- `.github/workflows/ci.yml`
  - Continuous integration validation
- `Dockerfile`
  - Container build for the app
- `docker-compose.yml`
  - Local multi-service deployment
- `turbo.json`
  - Turborepo task orchestration
- `package.json`
  - Root workspace scripts

### apps/web Structure

- `app`
  - UI routes and API routes
- `components`
  - Shared UI and provider components
- `lib`
  - Business logic, data access, validation, auth, workflows, utilities
- `public`
  - Service worker, static assets, uploaded local media
- `tests`
  - Unit, integration, and e2e-style tests

---

## 2. Product Overview

This platform is a snooker management and live-viewing system.

It should allow:

- admins to manage the platform, players, users, umpires, settings, streams, and matches
- umpires to run live scoring workflows
- public viewers to browse and watch matches without being forced to log in
- signed-in viewers to save favorite players, use chat, and access premium viewer features
- the system to provide realtime updates, notifications, offline fallback, and operational visibility

---

## 3. Feature Inventory

## 3.1 Authentication And Access Control

### Main files

- `apps/web/lib/auth.ts`
- `apps/web/proxy.ts`
- `apps/web/app/api/auth/register/route.ts`
- `apps/web/app/login/page.tsx`
- `apps/web/app/register/page.tsx`

### What is implemented

- credentials login
- Google login support
- role model with `user`, `admin`, and `umpire`
- protected admin and umpire route groups
- registration with platform setting enforcement

### What this feature should do

- normal viewers can sign up and sign in
- admins can access only admin tools
- umpires can access only umpire tools
- unauthorized users should never use admin/umpire routes successfully

### Current state

- implemented

### Missing or partial

- full security audit across all routes is still a recommended hardening step

---

## 3.2 Home Page And Public Match Discovery

### Main files

- `apps/web/app/page.tsx`
- `apps/web/app/api/matches/route.ts`
- `apps/web/app/api/settings/route.ts`

### What is implemented

- live match listing
- scheduled match listing
- completed match listing
- search over matches and players
- announcement and maintenance visibility
- notification controls
- fallback to cached match feed when offline

### What this feature should do

- let a visitor immediately understand what is live, upcoming, and completed
- highlight currently live matches
- allow quick navigation to watch pages
- remain usable even during transient network issues

### Current state

- implemented

### Missing or partial

- no advanced personalized recommendation system

---

## 3.3 Watch Page

### Main files

- `apps/web/app/watch/[id]/page.tsx`
- `apps/web/app/api/matches/[id]/route.ts`
- `apps/web/app/api/matches/[id]/viewers/route.ts`
- `apps/web/lib/viewer-presence.ts`

### What is implemented

- public watch page
- stream player
- score and frame state
- event feed
- viewer count tracking
- chat panel
- cached snapshot fallback if network is unavailable

### What this feature should do

- allow a viewer to open a match without login
- show the current stream if configured
- display scores and event history
- show active viewer count
- recover gracefully when data cannot be refreshed

### Current state

- implemented

### Missing or partial

- no advanced media controls beyond embedded provider support

---

## 3.4 Live Chat, Mentions, And Moderation

### Main files

- `apps/web/app/api/matches/[id]/chat/route.ts`
- `apps/web/app/api/matches/[id]/chat/[messageId]/route.ts`
- `apps/web/app/api/users/mentions/route.ts`
- `apps/web/lib/chat-moderation.ts`

### What is implemented

- signed-in live chat posting
- public chat reading
- mention suggestions
- abusive-word masking
- chat message deletion by owner or admin

### What this feature should do

- allow audience interaction on live matches
- prevent obvious abuse and spam
- support user mentions in chat
- allow moderation when needed

### Current state

- implemented

### Missing or partial

- no advanced moderation dashboard
- no chat attachment/media support

---

## 3.5 Player Directory And Favorites

### Main files

- `apps/web/app/players/page.tsx`
- `apps/web/app/api/players/route.ts`
- `apps/web/app/api/user/profile/route.ts`
- `apps/web/lib/player-profiles.ts`

### What is implemented

- searchable player directory
- filtering by name and country
- rank and profile data
- favorite player tracking on user profile

### What this feature should do

- let viewers discover players
- let signed-in viewers follow favorite players
- provide player metadata for admin scheduling and public browsing

### Current state

- implemented

### Missing or partial

- no deep player career statistics management UI

---

## 3.6 Analytics

### Main files

- `apps/web/app/analytics/page.tsx`
- `apps/web/app/api/analytics/players/route.ts`
- `apps/web/lib/analytics.ts`

### What is implemented

- player analytics based on finished matches and event history
- win rate, frames, scoring visits, and related metrics
- offline cached snapshot behavior

### What this feature should do

- show performance summaries derived from recorded match outcomes and events
- provide easy ranking and comparison information

### Current state

- implemented

### Missing or partial

- no advanced BI/report builder or export suite

---

## 3.7 VOD Library

### Main files

- `apps/web/app/vod/page.tsx`
- `apps/web/app/api/vod/route.ts`
- `apps/web/lib/stream-embed.ts`

### What is implemented

- VOD library page for completed matches
- playback URL support
- chapter markers generated from match context

### What VOD means

VOD means `Video On Demand`.

### What is the use of VOD

VOD is used so viewers do not need to watch only live matches. It gives them a way to:

- replay finished matches later
- review highlights and key moments
- revisit important tournament games after the live event is over
- study player performance and match flow
- let the platform keep useful historical viewing content instead of losing value after a live broadcast ends

### What this feature should do

- show a library of completed matches that have playback content
- allow viewers to watch those recordings later
- show useful chapter markers or summary context so users can jump through a match faster

### Current state

- implemented

### Missing or partial

- no advanced VOD transcoding pipeline
- no download/offline video ownership model

---

## 3.8 Multi-Stream Viewing

### Main files

- `apps/web/app/multi-stream/page.tsx`
- `apps/web/lib/access.ts`
- `apps/web/lib/subscriptions.ts`

### What is implemented

- multi-stream wall
- effective stream limits by role or subscription tier

### What this feature should do

- allow a user to open multiple live tables at once
- restrict the number of simultaneous streams based on plan/access level

### Current state

- implemented

### Missing or partial

- no advanced picture-in-picture orchestration or custom stream layouts

---

## 3.9 Subscription And Premium Viewer Access

### Main files

- `apps/web/lib/subscriptions.ts`
- `apps/web/lib/access.ts`
- `apps/web/app/api/subscription/checkout/route.ts`
- `apps/web/app/profile/page.tsx`

### What is implemented

- viewer subscription tier handling
- checkout initiation endpoint
- role-aware premium access rules
- protection against privileged users using billable viewer tiers

### What this feature should do

- let standard viewers upgrade access
- keep admin and umpire roles on role-based access instead of viewer billing
- increase stream allowance/features based on tier

### Current state

- implemented

### Missing or partial

- no full subscription management portal with renewal/cancel/payment history UI

---

## 3.10 Push Notifications

### Main files

- `apps/web/lib/push.ts`
- `apps/web/lib/push-subscription.ts`
- `apps/web/app/api/push/public-key/route.ts`
- `apps/web/app/api/push/subscription/route.ts`
- `apps/web/public/sw.js`

### What is implemented

- VAPID-based browser push subscriptions
- background notifications through service worker
- favorite-player match-live alerts

### What this feature should do

- allow signed-in users to opt into push alerts
- notify them when favorite players go live
- work even when the tab is not actively open

### Current state

- implemented

### Missing or partial

- no email or SMS fallback channel

---

## 3.11 PWA And Offline Support

### Main files

- `apps/web/app/manifest.ts`
- `apps/web/app/icon.tsx`
- `apps/web/app/offline/page.tsx`
- `apps/web/components/providers.tsx`
- `apps/web/components/NetworkStatusBanner.tsx`
- `apps/web/public/sw.js`
- `apps/web/lib/offline-cache.ts`

### What is implemented

- installable web app manifest
- service worker registration
- offline fallback page
- network status banner
- public page caching
- public API caching
- client-side cached snapshots for major public pages

### What this feature should do

- allow installation on supported devices/browsers
- keep public browsing available if connection drops
- avoid using unsafe caching for admin/auth/profile/private actions

### Current state

- implemented

### Missing or partial

- no offline write sync for chat, scoring, admin edits, or profile updates

---

## 3.12 Admin Dashboard

### Main files

- `apps/web/app/admin/page.tsx`
- `apps/web/app/api/admin/dashboard/route.ts`
- `apps/web/app/api/admin/events/route.ts`

### What is implemented

- admin totals and overview
- recent events
- dashboard state handling improvements

### What this feature should do

- act as control center for platform operations
- show important counts and recent changes
- surface platform activity without requiring deep navigation

### Current state

- implemented

### Missing or partial

- no advanced custom dashboard builder

---

## 3.13 Match Management

### Main files

- `apps/web/app/admin/matches/create/page.tsx`
- `apps/web/app/admin/matches/[id]/edit/page.tsx`
- `apps/web/app/api/matches/route.ts`
- `apps/web/app/api/matches/[id]/route.ts`
- `apps/web/lib/validation.ts`

### What is implemented

- create match
- edit match
- assign umpire
- set stream URLs, thumbnails, VOD URL
- update status
- delete match

### What this feature should do

- let admins manage the full lifecycle of a match
- ensure only valid registered players are used
- let admin attach broadcast and archive metadata

### Current state

- implemented

### Missing or partial

- no advanced bulk scheduling/import workflow

---

## 3.14 Player Management

### Main files

- `apps/web/app/admin/players`
- `apps/web/app/api/admin/players`
- `apps/web/lib/models/PlayerProfile.ts`

### What is implemented

- player creation
- player editing
- player listing for admin

### What this feature should do

- maintain clean player records used by scheduling, search, favorites, and analytics

### Current state

- implemented

### Missing or partial

- no advanced merge/deduplication workflow for player records

---

## 3.15 Umpire Management

### Main files

- `apps/web/app/admin/umpires`
- `apps/web/app/api/admin/umpires/route.ts`
- `apps/web/lib/umpire-assignment.ts`
- `apps/web/lib/mail.ts`

### What is implemented

- umpire listing
- umpire account creation
- assignment lookup
- welcome or assignment email flow

### What this feature should do

- let admins onboard umpires
- let admins assign umpires to matches
- notify umpires about access and responsibilities

### Current state

- implemented

### Missing or partial

- no advanced umpire scheduling calendar

---

## 3.16 User Management

### Main files

- `apps/web/app/admin/users/page.tsx`
- `apps/web/app/api/admin/users/route.ts`
- `apps/web/app/api/admin/users/[id]/route.ts`

### What is implemented

- user listing
- role updates
- subscription tier normalization
- user deletion

### What this feature should do

- let admin control access and account state
- keep tier data valid when role changes

### Current state

- implemented

### Missing or partial

- no advanced audit UI for all historical role changes

---

## 3.17 Settings, Maintenance, And Announcements

### Main files

- `apps/web/app/admin/settings/page.tsx`
- `apps/web/app/api/admin/settings/route.ts`
- `apps/web/components/GlobalAnnouncement.tsx`
- `apps/web/lib/settings.ts`

### What is implemented

- maintenance mode
- registration enable/disable
- global announcement broadcasting

### What this feature should do

- let admin temporarily freeze sensitive operations
- control whether new users can register
- broadcast platform-wide messages

### Current state

- implemented

### Missing or partial

- no scheduled announcement publishing system

---

## 3.18 Umpire Scoring Flow

### Main files

- `apps/web/app/umpire/match/[id]/page.tsx`
- `apps/web/app/api/score/update/route.ts`
- `apps/web/app/api/foul/add/route.ts`
- `apps/web/app/api/frame/end/route.ts`

### What is implemented

- scoring updates
- foul entry
- frame completion
- live event broadcasting

### What this feature should do

- let the assigned umpire operate a live match correctly
- keep viewer/admin screens in sync with scoring actions

### Current state

- implemented

### Missing or partial

- deeper umpire journey automation tests would still help

---

## 3.19 Tournament Brackets

### Main files

- `apps/web/app/admin/brackets/page.tsx`
- `apps/web/app/api/brackets/route.ts`
- `apps/web/lib/brackets.ts`

### What is implemented

- bracket generation and display

### What this feature should do

- visualize tournament progression structure
- show bracket pairings in admin-facing form

### Current state

- implemented

### Missing or partial

- no very advanced bracket editing and progression engine

---

## 3.20 Observability

### Main files

- `apps/web/lib/logger.ts`
- `apps/web/lib/metrics.ts`
- `apps/web/app/api/health/route.ts`
- `apps/web/app/api/metrics/route.ts`
- `apps/web/app/admin/observability/page.tsx`

### What is implemented

- structured logs
- alert webhook fan-out for warnings/errors
- process and request metrics
- health endpoint
- admin observability dashboard

### What this feature should do

- show whether the platform is healthy
- surface operational warnings
- expose metrics for debugging and monitoring

### Current state

- implemented

### Missing or partial

- no full distributed tracing platform

---

## 3.21 Validation, Rate Limiting, And Runtime Safety

### Main files

- `apps/web/lib/validation.ts`
- `apps/web/lib/schemas.ts`
- `apps/web/lib/request.ts`
- `apps/web/lib/rate-limit.ts`
- `apps/web/lib/runtime-config.ts`

### What is implemented

- request payload validation
- structured request helpers
- Mongo-backed rate limiting with fallback
- runtime configuration health checks

### What this feature should do

- block malformed input
- reduce abuse and spam
- fail more safely when config is incomplete

### Current state

- implemented

### Missing or partial

- no repo-level WAF/CDN policy automation

---

## 3.22 Uploads And Storage

### Main files

- `apps/web/app/api/upload/route.ts`
- `apps/web/lib/upload-storage.ts`

### What is implemented

- upload endpoint
- local/external/object storage mode support
- production safety checks

### What this feature should do

- allow match-related media uploads
- support production-friendly storage strategies

### Current state

- implemented

### Missing or partial

- no complete media-processing/CDN pipeline

---

## 3.23 Infrastructure And Deployment

### Main files

- `infra/terraform/main.tf`
- `infra/terraform/README.md`
- `docker-compose.yml`
- `Dockerfile`
- `vercel.json`

### What is implemented

- local deployment stack
- containerized app deployment
- Terraform baseline for AWS-like production setup

### What this feature should do

- make local and cloud deployment reproducible
- support ECS/Fargate style deployment with observability/secrets wiring

### Current state

- implemented

### Missing or partial

- no full backup/restore automation and environment rollout orchestration inside repo

---

## 4. What Is Present Versus Not Present

## 4.1 Clearly Present

- auth and RBAC
- public homepage
- public watch page
- live scoring
- chat and mentions
- player directory
- favorites
- notifications
- analytics
- VOD
- multi-stream
- admin dashboard
- user management
- umpire management
- player management
- match management
- settings and maintenance controls
- brackets
- observability
- rate limiting
- validation
- PWA/offline support
- CI
- Terraform baseline

## 4.2 Still Missing Or Not Fully Finished

- full browser-driven UI e2e automation
- complete enterprise-grade security review
- advanced billing/subscription management UX
- advanced moderation console
- richer tournament engine beyond current bracket support
- native mobile app ecosystem
- offline write queue and later sync
- full backup and disaster recovery automation in-repo
- full tracing platform and external ops dashboard provisioning

---

## 5. Test Cases

This section includes practical test coverage expectations for the current product.

## 5.1 Authentication And Access

### Test cases

- Register a new viewer with valid data
- Reject registration with duplicate email
- Reject registration when registration is disabled
- Reject registration during maintenance mode
- Log in with valid credentials
- Reject invalid login credentials
- Verify admin route redirects/block for non-admin user
- Verify umpire route redirects/block for non-umpire user
- Verify admin user can access admin pages
- Verify umpire user can access assigned umpire pages

### Existing automated coverage

- registration workflow tests
- access control tests

---

## 5.2 Home Page And Match Discovery

### Test cases

- Home page shows live matches correctly
- Home page shows scheduled matches correctly
- Home page shows completed matches correctly
- Search filters match title and player names correctly
- Offline cache snapshot is used when network is unavailable
- Maintenance announcement appears when enabled

### Existing automated coverage

- indirect support through route validation and build checks

---

## 5.3 Watch Page

### Test cases

- Anonymous viewer can open a watch page
- Watch page loads match state and event feed
- Watch page shows stream when `streamUrl` exists
- Watch page shows fallback when no stream exists
- Viewer count heartbeat increments and updates count
- Viewer count release decrements correctly
- Watch page falls back to cached snapshot when network fails
- Watch page does not throw a console-breaking error when fetch fails

### Existing automated coverage

- alert workflow coverage
- general route/build coverage

---

## 5.4 Chat

### Test cases

- Anonymous viewer can read chat
- Anonymous viewer cannot post chat
- Signed-in viewer can post valid chat message
- Chat rejects spammy or invalid message input
- Chat masks abusive language
- Mention suggestions return matching users
- Admin can remove a chat message
- Message owner can remove their own message
- Unrelated user cannot remove another user’s message

### Existing automated coverage

- validation and moderation tests

---

## 5.5 Player Directory And Favorites

### Test cases

- Public player directory loads
- Player search by name works
- Player filter by country works
- Signed-in user can add a favorite player
- Signed-in user can remove a favorite player
- Invalid favorite player submission is rejected
- Offline player snapshot is used when network fails

### Existing automated coverage

- player profile validation tests

---

## 5.6 Analytics

### Test cases

- Analytics endpoint returns player aggregates
- Win rate calculation is correct
- Frames won/lost values are correct
- Highest scoring visit is correct
- Analytics page handles empty results correctly
- Analytics page uses cached snapshot offline

### Existing automated coverage

- route/build coverage, indirect analytics feature wiring

---

## 5.7 VOD

### Test cases

- VOD page lists only matches with playback URLs
- VOD page shows winner and score
- VOD chapter markers render correctly
- VOD page handles zero available VOD items
- Cached VOD snapshot appears offline

### Existing automated coverage

- route/build coverage

---

## 5.8 Multi-Stream

### Test cases

- Free viewer gets only allowed stream count
- Plus/Pro viewer gets increased stream count
- Admin and umpire receive privileged access limit
- Selected streams never exceed effective max streams
- Live stream list falls back to cached snapshot offline

### Existing automated coverage

- access control tests

---

## 5.9 Premium Subscription

### Test cases

- Viewer can start checkout for allowed tier
- Admin cannot purchase viewer tier
- Umpire cannot purchase viewer tier
- Duplicate tier purchase is rejected
- Dev bypass upgrade works when enabled
- External checkout URL is returned when billing endpoint is configured

### Existing automated coverage

- subscription checkout workflow tests

---

## 5.10 Push Notifications

### Test cases

- Public key endpoint returns configured key
- Browser subscription can be stored for signed-in user
- Stored subscription can be deleted
- Invalid subscription payload is rejected
- Favorite-player live transition triggers push attempt
- Notification service worker displays push payload

### Existing automated coverage

- push tests
- push subscription workflow tests
- alert workflow tests

---

## 5.11 PWA And Offline

### Test cases

- Manifest is present and valid
- Service worker registers in production
- Offline page is reachable
- Public navigations fall back to offline page when uncached
- Cached public pages still open offline
- Cached public API responses are used when network fails
- Network status banner appears when browser goes offline
- Offline cache helper safely reads fallback values

### Existing automated coverage

- offline cache helper tests

---

## 5.12 Admin Dashboard

### Test cases

- Admin dashboard loads counts and event feed
- Dashboard handles transient API failure without hard-crashing UI
- Non-admin cannot access dashboard data
- Clear/reset actions work if provided

### Existing automated coverage

- route/build coverage

---

## 5.13 Match Management

### Test cases

- Admin can create a match with valid players
- Match creation rejects duplicate same-player pairing
- Match creation rejects unknown players
- Admin can edit match details
- Umpire cannot edit admin-only metadata
- Admin can delete a match
- Favorite-player alert is triggered on status transition to `live`

### Existing automated coverage

- validation tests
- alert workflow tests

---

## 5.14 Player Management

### Test cases

- Admin can create a player
- Admin can update a player
- Player rank validation rejects invalid values
- Public player API returns expected profile data

### Existing automated coverage

- validation tests

---

## 5.15 Umpire Management

### Test cases

- Admin can create umpire account
- Invalid umpire assignment is rejected
- Assigned umpire can see assigned matches
- Assignment email attempt occurs when configured

### Existing automated coverage

- route/build coverage

---

## 5.16 User Management

### Test cases

- Admin can list users
- Admin can change role
- Tier is normalized when role becomes admin or umpire
- Admin can delete user
- Non-admin cannot manage users

### Existing automated coverage

- access and route coverage

---

## 5.17 Settings And Maintenance

### Test cases

- Admin can enable maintenance mode
- Registration is blocked during maintenance when applicable
- Admin can disable registration
- Announcement text is validated and updated
- Public settings endpoint reflects latest values

### Existing automated coverage

- settings tests
- validation tests

---

## 5.18 Umpire Scoring

### Test cases

- Assigned umpire can add score event
- Assigned umpire can add foul event
- Assigned umpire can end frame
- Unassigned umpire is rejected
- Viewer watch page receives realtime scoring updates

### Existing automated coverage

- route/build coverage

---

## 5.19 Brackets

### Test cases

- Bracket generator pads entrants to next power of two
- Bracket API returns correct structure
- Empty/small field behaves safely

### Existing automated coverage

- bracket generation tests

---

## 5.20 Observability

### Test cases

- Health endpoint reports `ok`, `warning`, or `degraded` correctly
- Metrics endpoint returns JSON format for admin
- Metrics endpoint returns Prometheus text format for admin
- Counters and histograms record values
- Logger increments log metrics
- Alert webhook fan-out attempts on warn/error

### Existing automated coverage

- metrics tests
- runtime config tests

---

## 5.21 Validation, Rate Limiting, And Runtime Safety

### Test cases

- Registration schema accepts valid values and rejects invalid ones
- Match schema validation rejects bad input
- Chat schema validation rejects abuse/spam patterns
- Settings validation constrains announcement length
- Rate limit blocks after threshold
- Runtime config flags missing critical environment variables
- Upload config warnings appear if external/object metadata is missing

### Existing automated coverage

- validation tests
- rate-limit tests
- runtime-config tests

---

## 5.22 Uploads And Storage

### Test cases

- Admin can upload file in allowed mode
- Non-admin upload is rejected
- Object/external storage requires endpoint metadata
- Production local upload protection behaves correctly

### Existing automated coverage

- runtime-config and route/build coverage

---

## 5.23 Infrastructure And CI

### Test cases

- CI runs lint, typecheck, test, and build
- Terraform formatting passes
- Terraform validation passes
- Docker build succeeds
- App health endpoint responds successfully in deployed environment

### Existing automated coverage

- GitHub Actions CI
- Terraform CI validation

---

## 6. Existing Automated Test Files

The repository already contains automated tests in `apps/web/tests`, including:

- `access.test.ts`
- `validation.test.ts`
- `settings.test.ts`
- `rate-limit.test.ts`
- `runtime-config.test.ts`
- `push.test.ts`
- `metrics.test.ts`
- `offline-cache.test.ts`
- `integration/registration-workflow.test.ts`
- `integration/push-subscription-workflow.test.ts`
- `integration/subscription-checkout-workflow.test.ts`
- `e2e/alert-workflow.test.ts`

These currently validate a meaningful part of the platform, but not every browser interaction end to end.

---

## 7. Final Product Understanding

If the codebase behaves as intended, the platform should do the following:

- admins create and manage the tournament platform
- umpires control live scoring
- viewers can browse and watch public matches freely
- signed-in viewers can personalize with favorites and chat
- premium viewers can unlock broader viewing access
- completed matches remain valuable through VOD playback
- favorite-player alerts keep fans engaged
- offline/PWA support keeps public content resilient
- observability and deployment tooling support production operation

---

## 8. Overall Current Status

### Strongly implemented

- core viewer experience
- core admin experience
- core umpire flow
- notifications
- analytics
- VOD
- offline/PWA
- observability
- validation/rate limiting
- deployment baseline

### Still recommended next improvements

- browser-driven UI e2e suite
- deeper admin and umpire workflow automation
- security review and hardening pass
- richer billing lifecycle tooling
- more advanced tournament tooling
- backup/recovery/runbook expansion

