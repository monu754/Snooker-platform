# Production Runbook

Date: 2026-03-26

## Scope

This runbook covers:

- environment readiness
- release verification
- health and observability checks
- backup and restore procedures
- rollback guidance
- common incident response paths

Primary operational surfaces:

- public app: `/`
- health endpoint: `GET /api/health`
- metrics endpoint: `GET /api/metrics`
- observability dashboard: `/admin/observability`
- infrastructure baseline: `infra/terraform`

## Required Configuration

Critical runtime variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Feature/runtime variables as needed:

- Google auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- realtime: `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- email: SMTP credentials used by `apps/web/lib/mail.ts`
- alert fan-out: `ALERT_WEBHOOK_URL`
- uploads: `UPLOAD_STORAGE_MODE`, storage endpoint/base URL variables
- billing: checkout endpoint variables used by the subscription workflow

Production expectations:

- `NEXTAUTH_URL` should be HTTPS
- object/external upload storage is strongly preferred
- `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=true` should be treated as an exception with explicit approval
- if Google auth is intentionally disabled, credentials-based admin/umpire access must still be verified

## Pre-Deployment Checklist

Before each production deployment:

1. Confirm the target image/container tag and Git commit SHA.
2. Confirm the previous stable release is still available for rollback.
3. Verify database backup freshness.
4. Verify object storage versioning or equivalent retention is enabled for uploaded assets.
5. Review `/api/health` in the current production environment for existing warnings.
6. Check `/admin/observability` for unusual error spikes, latency, or memory growth before rollout.
7. Confirm whether the release contains schema changes, auth changes, storage changes, or cache/service-worker changes.
8. If the release changes auth or security headers, test login, logout, and at least one admin-only route in staging.

## Build And Verification

From `apps/web` run:

```bash
npm run check-types
npm run test
npm run build
npm run test:ui
```

Minimum smoke verification after deployment:

1. Open `/` and confirm public landing data loads.
2. Open `/players` and `/analytics`.
3. Verify `/api/health` returns `status=ok` or an expected `status=warning`.
4. Verify `/api/metrics` remains admin-protected.
5. Sign in as an admin and open `/admin/observability`.
6. If push is enabled, verify `GET /api/push/public-key` returns 200.
7. If uploads are enabled, perform one small admin image upload.

## Runtime Health Reference

`GET /api/health` meanings:

- `ok`: database and critical runtime configuration are healthy
- `warning`: app is serving traffic, but configuration gaps exist
- `degraded`: database or another critical dependency is failing

`GET /api/metrics`:

- Prometheus text by default
- JSON with `?format=json`
- admin authentication required

Operational dashboards to review first:

- `/admin/observability`
- ALB target health
- ECS task count and restarts
- ECS CPU and memory
- CloudWatch application logs
- external alerts wired from `ALERT_WEBHOOK_URL`

## Backup Policy

### MongoDB

Recommended baseline:

- daily snapshots minimum
- point-in-time recovery if supported by the provider
- retention long enough to cover delayed corruption discovery
- backup success alerting outside the database platform

Record for each backup job:

- snapshot identifier
- completion timestamp
- retention window
- restore method reference

### Uploaded Assets

Recommended baseline:

- object storage only in production
- bucket/container versioning enabled
- lifecycle retention for accidental overwrite/deletion recovery
- periodic inventory or replication if compliance/recovery objectives require it

Protect against:

- silent overwrite
- accidental delete
- expired credentials breaking writes
- incorrect public base URL after restore

## Restore Procedures

### Database Restore

Use this flow for data corruption, operator error, or catastrophic data loss:

1. Identify the restore target timestamp or snapshot ID.
2. Decide whether to restore in place or into a parallel recovery database.
3. Prefer restoring into a parallel environment first when time allows.
4. Disable risky writes if necessary:
   - set maintenance mode
   - pause admin data mutation activities
   - communicate the user-facing impact
5. Restore the snapshot using the database provider workflow.
6. Point the app to the restored database connection string if restoring in parallel.
7. Redeploy or restart the app so connections are refreshed.
8. Verify:
   - `GET /api/health`
   - user login
   - match list loading
   - one admin page
   - one write path in a controlled environment
9. Capture the exact restored snapshot ID and switchover time in the incident log.

### Asset Restore

Use this flow for missing or overwritten thumbnails/uploads:

1. Identify the asset path and last known good version.
2. Restore the object from version history or backup copy.
3. Confirm the storage endpoint and public base URL still map correctly.
4. Invalidate CDN/cache entries if stale objects may still be served.
5. Reload the affected page and confirm the restored asset is visible.
6. Record the restored object version ID and the operator who performed the restore.

### Restore Drill Cadence

At least once per quarter:

1. Restore one MongoDB snapshot into a non-production environment.
2. Restore one representative uploaded asset.
3. Run app smoke checks against the restored environment.
4. Record time-to-restore and any manual gaps discovered.
5. Update this runbook with lessons learned.

## Rollback Procedure

Use rollback when a release causes broad regressions and the database does not need point-in-time recovery.

1. Confirm the previous stable image/tag and task definition revision.
2. Pause additional deployments.
3. Roll ECS/service deployment back to the prior revision.
4. Monitor:
   - task health
   - ALB target health
   - `/api/health`
   - error rate in logs and metrics
5. Re-test the affected user flow.
6. If the failed release changed data shape, evaluate whether rollback alone is safe before promoting traffic.

Rollback is not enough when:

- destructive schema/data migrations already ran
- an external billing/storage side effect must be reversed
- corrupted data has already been written

## Environment-Specific Release Operations

### Staging

Use staging for:

- auth-provider validation
- admin and umpire browser-flow verification
- upload and storage configuration checks
- push/realtime integration checks
- release-candidate smoke testing before production approval

Suggested staging release flow:

1. deploy the candidate image and infrastructure revision
2. run `GET /api/health`
3. verify login for admin, umpire, and viewer
4. verify one admin mutation, one umpire scoring action, and one public watch page
5. verify `npm run test:ui` against staging if environment parity is available
6. approve promotion only if no new warnings/errors appear in logs and metrics

### Production

Suggested production release flow:

1. verify staging sign-off and artifact immutability
2. record the target image tag, task definition revision, and exact rollout start time
3. deploy gradually if the platform supports partial traffic shifting
4. monitor `/api/health`, `/api/metrics`, `/admin/observability`, ECS, ALB, and recent logs during rollout
5. complete smoke verification before declaring the release healthy
6. keep rollback information visible until the post-release watch window ends

### Post-Release Watch Window

For the first monitoring window after production rollout:

- watch auth failures
- watch 4XX and 5XX trends
- watch rate-limit spikes
- watch viewer-presence and realtime event anomalies
- watch upload, push, and billing errors if those features changed

## Security Operations Notes

- mutating routes should enforce same-origin protections
- response headers should include CSP, `X-Frame-Options`, `nosniff`, and cross-origin isolation protections
- privileged access must be restricted to `/admin` and `/umpire` paths through auth middleware
- production auth should not rely on partially configured providers
- uploads accept only JPEG, PNG, and WebP images up to 5MB

Post-release security spot checks:

1. Confirm `/admin` redirects unauthenticated traffic.
2. Confirm registration obeys maintenance mode and registration toggles.
3. Confirm admin-only upload remains blocked for non-admin users.
4. Confirm browser console shows no CSP violations on key pages after release.

## Secrets Rotation

Rotate secrets with a staged plan and a recorded owner/time window.

Secrets that require explicit rotation procedures:

- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- SMTP credentials
- push VAPID keys
- billing credentials
- storage credentials/endpoints where applicable
- `MONGODB_URI` or database user credentials

General rotation flow:

1. create or obtain the replacement secret in the source system
2. update the secret in the platform secret manager
3. deploy to staging first when the integration is customer-visible
4. test the affected flow in staging
5. roll the secret to production during a controlled window
6. restart or redeploy workloads that cache the secret at process start
7. verify the affected user journey and logs
8. revoke the old secret once production verification is complete

Feature-specific validation after rotation:

- auth secrets: sign-in, sign-out, callback handling
- Pusher secrets: live score or dashboard realtime event flow
- SMTP secrets: test email delivery
- VAPID keys: `GET /api/push/public-key` and one browser subscription cycle
- storage secrets: one upload and one asset readback
- billing secrets: checkout initiation path
- database credentials: `/api/health`, login, and a representative read/write action

## Incident Triage

Start every incident with:

1. incident start time
2. current customer impact
3. affected paths or workflows
4. latest deploy SHA/image tag
5. whether rollback is currently viable

First checks:

1. `GET /api/health`
2. `GET /api/metrics?format=json` as admin
3. `/admin/observability`
4. recent application warnings/errors
5. ALB and ECS health

## Incident Playbooks

### App Down Or Broad 5XXs

1. Check ECS task failures and restart loops.
2. Check database connectivity errors in logs.
3. Check whether a new deploy happened immediately before impact.
4. Roll back if the release is the likely cause and rollback is safe.
5. If rollback is not enough, move to database/storage-specific recovery.

### Database Degradation

Indicators:

- `/api/health` returns `degraded`
- login and public lists fail together
- connection timeout or authentication errors in logs

Actions:

1. Verify database provider status.
2. Verify secrets/connection string rotation state.
3. Confirm network path from app to database.
4. If corruption or data loss is involved, initiate the restore procedure.

### Push Notifications Failing

1. Check `GET /api/push/public-key`.
2. Verify VAPID keys and subject.
3. Review application logs for push send failures and invalid subscription cleanup.
4. Validate that affected users still have stored subscriptions.
5. Verify browser permissions on a fresh client session.

### Realtime Or Viewer Count Drift

1. Validate Pusher credentials and cluster values.
2. Check provider status for the realtime service.
3. Confirm viewer heartbeat/decrement endpoints are not being rate-limited unexpectedly.
4. Compare live viewer counts against recent reconnect/reload events.

### Upload Failures

1. Confirm upload mode from `/api/health`.
2. Verify storage endpoint reachability.
3. Verify public base URL and object permissions.
4. Confirm local-disk storage was not accidentally enabled in production.
5. Test with a supported image under 5MB.

### Auth And Login Failures

1. Confirm `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.
2. If Google auth is affected, verify both Google env vars are present and correct.
3. Confirm credentials login still works for admin/umpire recovery access.
4. Review security header and cookie-related issues after recent auth changes.

## Communications

During high-severity incidents:

- assign one incident lead
- log key decisions and timestamps
- provide user-facing updates at a fixed cadence
- note whether mitigation, rollback, or restore is in progress

Before closing the incident:

1. confirm customer impact has ended
2. capture root cause and contributing factors
3. document whether alerts fired as expected
4. create follow-up work for missing automation, tests, or safeguards

## Recommended Next Steps

- automate a scheduled restore drill checklist
- add explicit staging-to-production promotion/approval steps
- wire backup freshness into `/admin/observability` or external alerting
- document exact secret rotation steps for auth, push, storage, and realtime providers
