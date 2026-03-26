# System Architecture - SnookerStream

SnookerStream is a high-performance snooker match tracking and live streaming platform built with a modern, scalable monorepo architecture.

## Tech Stack

- **Monorepo Management**: [Turborepo](https://turbo.build/repo)
- **Frontend/Backend**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: Vanilla CSS & Tailwind CSS
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google & Credentials)
- **Real-time Updates**: [Pusher](https://pusher.com/)
- **State Management**: React Hooks & Context API

## Core Components

### 1. Monorepo Structure
The project is organized into `apps` and `packages`:
- `apps/web`: The main Next.js application.
- `apps/docs`: Documentation site (if implemented).
- `packages/ui`: Shared React components.
- `packages/typescript-config`: Shared TS configurations.
- `packages/eslint-config`: Shared linting rules.

### 2. Data Flow
- **API Layer**: Next.js Route Handlers manage requests and interface with MongoDB.
- **Real-time Scoring**: Umpire actions trigger API calls that update the database and broadcast events via Pusher for live viewer updates.
- **Authentication**: Role-based access control (Admin, Umpire, User) is managed via NextAuth JWT sessions.

### 3. Scalability Design
- **Database Indexing**: Optimized indices for matches and chat messages.
- **Connection Caching**: MongoDB connections are cached in a global variable to prevent exhaustion in serverless environments.
- **Stateless Auth**: JWT-based sessions minimize server-side state.

## Security
- Password hashing using `bcryptjs`.
- CSRF protection via NextAuth.
- API route protection using `getServerSession`.

## Operational Readiness

- **Health Checks**: `GET /api/health` verifies application and database readiness.
- **Metrics**: `GET /api/metrics` exposes Prometheus-style counters and histograms, while `/admin/observability` renders a simple operational dashboard.
- **Structured Logging**: `apps/web/lib/logger.ts` emits JSON logs for info, warnings, and errors.
- **Alert Hooks**: warning/error logs can fan out to `ALERT_WEBHOOK_URL` for incident routing.
- **Upload Storage Modes**: uploads support `local`, `external`, and `object` storage integrations.
- **Billing Integration**: premium checkout uses a configurable external checkout endpoint, while admin and umpire accounts stay role-based and bypass premium plans.
- **Local Deployment**: root `docker-compose.yml` provides an app + MongoDB stack for reproducible local and server deployment.
- **Cloud IaC**: `infra/terraform` provides an AWS baseline for VPC, ALB, ECS Fargate, logs, dashboard wiring, and secrets-based runtime configuration.
