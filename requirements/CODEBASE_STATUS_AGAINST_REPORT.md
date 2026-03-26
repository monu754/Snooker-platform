# Codebase Status Against Uploaded Report

Date: 2026-03-26

Source compared:

- `C:\Users\ASUS\Downloads\snooker app report (manotosh).docx`
- current repository code in `apps/web`, `packages`, `infra`, tests, and requirements docs

## Summary

The uploaded report is now materially outdated.

Most of the product areas it described as pending are already implemented in the website and supporting backend. The current codebase now includes:

- complete admin match create/edit/delete flows
- actual maintenance-mode and registration enforcement
- player directory plus admin player management
- live viewer presence and watch-page chat enhancements
- browser push notifications for favorite players
- installable/offline-capable PWA behavior
- analytics, VOD, multi-stream, brackets, and partner/live APIs
- request validation, rate limiting, runtime health checks, and structured observability
- workflow tests plus browser-driven Playwright coverage, including privileged admin and umpire journeys
- operational docs and infrastructure baseline

What remains is now narrower and is mostly about external assurance and deeper production automation rather than missing headline features.

## Working In Current Code

These report items are implemented and visible in the current website/codebase:

- Google plus credentials auth via [auth.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/auth.ts), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/login/page.tsx), and [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/register/page.tsx)
- RBAC for admin and umpire route groups via [proxy.ts](/E:/Project/Snooker/snooker-platform/apps/web/proxy.ts)
- registration with settings and maintenance enforcement via [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/auth/register/route.ts)
- public home page with live, scheduled, completed, search, favorites alerts entry points, and offline snapshot fallback via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/page.tsx)
- watch page with embedded stream support, score/event feed, viewer count, realtime chat, mention suggestions, moderation, and offline snapshot fallback via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/watch/[id]/page.tsx)
- profile update flow and favorite-player management via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/profile/page.tsx) and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/user/profile/route.ts)
- admin dashboard and recent event stream via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/page.tsx) and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/dashboard/route.ts)
- full admin match lifecycle, including edit UI, player validation, stream metadata, thumbnail/VOD fields, and delete flow via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/matches/create/page.tsx), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/matches/[id]/edit/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/matches/route.ts), and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/matches/[id]/route.ts)
- admin player management via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/players/page.tsx), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/players/create/page.tsx), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/players/[id]/edit/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/players/route.ts), and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/players/[id]/route.ts)
- admin umpire management and onboarding email flow via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/umpires/page.tsx) and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/umpires/route.ts)
- admin user management via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/users/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/users/route.ts), and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/users/[id]/route.ts)
- admin streaming control and live URL update messaging via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/streaming/page.tsx)
- admin brackets and bracket API via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/brackets/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/brackets/route.ts), and [brackets.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/brackets.ts)
- admin observability dashboard, health endpoint, and metrics endpoint via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/observability/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/health/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/metrics/route.ts), and [metrics.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/metrics.ts)
- admin settings, maintenance mode, registration toggle, and global announcement broadcasting via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/admin/settings/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/settings/route.ts), and [GlobalAnnouncement.tsx](/E:/Project/Snooker/snooker-platform/apps/web/components/GlobalAnnouncement.tsx)
- umpire dashboard and assigned-match scoring flow via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/umpire/page.tsx), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/umpire/match/[id]/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/score/update/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/foul/add/route.ts), and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/frame/end/route.ts)
- player directory and favorites via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/players/page.tsx) and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/players/route.ts)
- analytics suite via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/analytics/page.tsx), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/analytics/players/route.ts), and [analytics.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/analytics.ts)
- multi-stream viewer experience with role/tier access caps via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/multi-stream/page.tsx), [access.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/access.ts), and [subscriptions.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/subscriptions.ts)
- VOD library and playback/chapter support via [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/vod/page.tsx) and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/vod/route.ts)
- push public key and browser subscription lifecycle via [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/push/public-key/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/push/subscription/route.ts), [push.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/push.ts), and [sw.js](/E:/Project/Snooker/snooker-platform/apps/web/public/sw.js)
- PWA install/offline support via [manifest.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/manifest.ts), [page.tsx](/E:/Project/Snooker/snooker-platform/apps/web/app/offline/page.tsx), [providers.tsx](/E:/Project/Snooker/snooker-platform/apps/web/components/providers.tsx), [NetworkStatusBanner.tsx](/E:/Project/Snooker/snooker-platform/apps/web/components/NetworkStatusBanner.tsx), and [offline-cache.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/offline-cache.ts)
- partner live API via [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/partner/live/route.ts)
- upload support with local/external/object storage modes via [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/upload/route.ts) and [upload-storage.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/upload-storage.ts)
- request validation, schemas, rate limiting, runtime config checks, and request helpers via [validation.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/validation.ts), [schemas.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/schemas.ts), [rate-limit.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/rate-limit.ts), [request.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/request.ts), and [runtime-config.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/runtime-config.ts)
- security hardening foundations including same-origin mutation checks, upload validation, and global security headers via [security.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/security.ts), [security-headers.js](/E:/Project/Snooker/snooker-platform/apps/web/lib/security-headers.js), and [next.config.js](/E:/Project/Snooker/snooker-platform/apps/web/next.config.js)
- additional internal security hardening on admin/player/umpire/event mutations and public health-response exposure via [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/players/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/players/[id]/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/umpires/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/admin/events/route.ts), [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/brackets/route.ts), and [route.ts](/E:/Project/Snooker/snooker-platform/apps/web/app/api/health/route.ts)
- reusable workflow modules for critical server journeys via [registration.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/registration.ts), [push-subscription.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/push-subscription.ts), [subscription-checkout.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/subscription-checkout.ts), [admin-match-management.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/admin-match-management.ts), [umpire-scoring.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/umpire-scoring.ts), [chat.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/chat.ts), [viewer-presence.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/viewer-presence.ts), and [match-live-alerts.ts](/E:/Project/Snooker/snooker-platform/apps/web/lib/workflows/match-live-alerts.ts)
- automated unit, integration, e2e-style workflow, and browser Playwright coverage via [tests](/E:/Project/Snooker/snooker-platform/apps/web/tests)
- CI for lint, typecheck, unit/integration tests, browser Playwright tests, build, and Terraform validation via [ci.yml](/E:/Project/Snooker/snooker-platform/.github/workflows/ci.yml)
- deployment baseline via [Dockerfile](/E:/Project/Snooker/snooker-platform/Dockerfile), [docker-compose.yml](/E:/Project/Snooker/snooker-platform/docker-compose.yml), [vercel.json](/E:/Project/Snooker/snooker-platform/vercel.json), and [main.tf](/E:/Project/Snooker/snooker-platform/infra/terraform/main.tf)
- reference documentation via [API.md](/E:/Project/Snooker/snooker-platform/requirements/API.md), [ARCHITECTURE.md](/E:/Project/Snooker/snooker-platform/requirements/ARCHITECTURE.md), [COMPLETE_CODEBASE_FEATURE_AND_TEST_REFERENCE.md](/E:/Project/Snooker/snooker-platform/requirements/COMPLETE_CODEBASE_FEATURE_AND_TEST_REFERENCE.md), and [PRODUCTION_RUNBOOK.md](/E:/Project/Snooker/snooker-platform/requirements/PRODUCTION_RUNBOOK.md)

## Automated Coverage Status

The current automation picture is stronger than the uploaded report suggests:

- unit coverage exists for validation, access rules, runtime config, rate limiting, metrics, offline cache, security helpers, and push payload logic
- integration workflow coverage exists for registration, push subscription lifecycle, subscription checkout, admin match management, umpire scoring, and chat
- e2e-style workflow tests exist for live alert transitions and viewer presence
- browser-driven Playwright coverage now exists for:
  - public route smoke coverage
  - admin redirect behavior
  - admin settings save flow
  - admin player-manager filtering
  - home-page filtering behavior
  - players-page search behavior
  - multi-stream tier-cap behavior
  - offline network banner behavior
  - cached analytics fallback behavior
  - login/register maintenance and provider-degradation behavior
  - umpire dashboard to scoring-panel journey
  - umpire score-entry interaction

Relevant browser test files:

- [admin-and-umpire.spec.ts](/E:/Project/Snooker/snooker-platform/apps/web/tests/ui/admin-and-umpire.spec.ts)
- [public-smoke.spec.ts](/E:/Project/Snooker/snooker-platform/apps/web/tests/ui/public-smoke.spec.ts)
- [viewer-flows.spec.ts](/E:/Project/Snooker/snooker-platform/apps/web/tests/ui/viewer-flows.spec.ts)
- [offline-and-auth.spec.ts](/E:/Project/Snooker/snooker-platform/apps/web/tests/ui/offline-and-auth.spec.ts)

Current enforcement:

- the Playwright suite is present and passes locally
- the current GitHub Actions workflow now runs `pnpm --filter web test:ui`

## Partial Or Needs Hardening

These are the areas that are still only partial compared with the strictest possible production-hardened target:

- the codebase now has a meaningful internal security review and hardening pass, but it still does not represent a formal independent third-party security assessment
- browser-driven coverage is materially broader and now includes privileged paths, but it still does not exhaustively cover every admin and umpire browser journey
- runbooks are now materially stronger, but deeper organization-specific recovery ownership, approval policy, and audit evidence practices can still be added

## Remaining Work

If the goal is "production-ready in the strictest sense," the main remaining work is:

- commission or perform a formal independent security assessment beyond the internal code review/hardening already in the repo
- continue expanding Playwright toward more full-fidelity admin match-management and broader umpire operational journeys
- add organization-specific approval records, ownership assignments, and recovery evidence to the runbooks if required by production governance

## Report Rows That Are Now Outdated

The uploaded report marks many of these as pending, but the website/codebase already has them:

- full match editing workflow
- actual maintenance-mode enforcement
- actual registration blocking when disabled
- live viewer count tracking used in the watch UI
- chat emoji, mentions, and moderation
- advanced player search and favorites
- browser push notifications
- PWA/offline support
- tournament brackets
- analytics suite
- multi-stream viewing
- partner live API
- subscription tiers and checkout wiring
- VOD library
- centralized request validation
- rate limiting and abuse protection
- workflow-based automated coverage
- browser-driven Playwright coverage
- privileged admin and umpire browser coverage
- browser automation in CI
- observability endpoints and dashboard
- production storage mode support
- deployment configuration and Terraform baseline
- expanded production runbook with release, rollback, secrets-rotation, backup, restore, and incident procedures

## Recommended Living Status File

If you want one status file to keep current as the website evolves, maintain this file:

- [CODEBASE_STATUS_AGAINST_REPORT.md](/E:/Project/Snooker/snooker-platform/requirements/CODEBASE_STATUS_AGAINST_REPORT.md)
