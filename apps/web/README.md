# SnookerStream Web App

## Local Development

Run the app from the workspace root:

```bash
pnpm dev
```

Or from `apps/web`:

```bash
npm run dev
```

The default local URL is [http://localhost:3000](http://localhost:3000).

## Validation Commands

From `apps/web`:

```bash
npm run check-types
npm run test
npm run build
```

The test suite now covers:

- unit tests for validation, access control, runtime config, rate limiting, and push payload validation
- integration workflow tests for registration, push subscription lifecycle, and subscription checkout
- e2e-style workflow tests for background alert transitions
- browser-driven Playwright smoke coverage via `npm run test:ui`

## Production Runtime Requirements

Required environment variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Common integration variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PUSHER_APP_ID`
- `PUSHER_SECRET`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ALERT_WEBHOOK_URL`
- `BILLING_CHECKOUT_ENDPOINT`
- `BILLING_API_KEY`

Upload storage:

- `UPLOAD_STORAGE_MODE=object` or `UPLOAD_STORAGE_MODE=external` is recommended for production.
- `UPLOAD_OBJECT_ENDPOINT` or `UPLOAD_EXTERNAL_ENDPOINT`
- `UPLOAD_OBJECT_PUBLIC_BASE_URL` or `UPLOAD_EXTERNAL_PUBLIC_BASE_URL`
- `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=true` should only be used intentionally for temporary/self-hosted deployments.

Rate limiting:

- the application now prefers Mongo-backed shared rate limiting automatically
- `RATE_LIMIT_DRIVER=memory` is available for tests or constrained local runs

## Health Checks

The app exposes:

- `GET /api/health`
- `GET /api/metrics`
- `GET /api/metrics?format=json`

That endpoint reports:

- database reachability
- configured upload mode
- missing critical runtime configuration

The metrics endpoints expose:

- Prometheus-style text output for scraping
- JSON runtime counters, histograms, and process stats for operational monitoring

## Production Notes

- Object/external upload storage should be configured before public production launch.
- Favorite-player notifications now use real background browser push with VAPID keys and a service worker.
- Structured logs are emitted as JSON and warnings/errors can fan out to `ALERT_WEBHOOK_URL`.
- Cloud IaC baseline now lives under `infra/terraform` for AWS ECS/Fargate style deployment.
- PWA support now includes an installable manifest, offline fallback page, cached public navigation, cached public API responses, and client-side snapshot fallback for the main discovery/watch pages.
- Sensitive session-backed mutations now enforce same-origin request checks, stricter upload validation, and global security headers.
- CI lives in `.github/workflows/ci.yml`.
- Local deployment support is available via the repo `docker-compose.yml`.

## Related Docs

- `requirements/API.md`
- `requirements/ARCHITECTURE.md`
- `requirements/CODEBASE_STATUS_AGAINST_REPORT.md`
- `requirements/PRODUCTION_RUNBOOK.md`
