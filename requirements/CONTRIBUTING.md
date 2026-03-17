# Contributing to SnookerStream

We welcome contributions! Whether you're fixing a bug, adding a feature, or improving documentation, here's how you can help.

## Development Setup

1.  **Clone the Repo**: `git clone https://github.com/your-username/snooker-platform.git`
2.  **Install Dependencies**: `pnpm install` (We use PNPM for monorepo management)
3.  **Environment Variables**: Create a `.env.local` in `apps/web` with MongoDB, NextAuth, and Pusher keys.
4.  **Run Development Mode**: `pnpm dev`
5.  **Open the App**: Visit `http://localhost:3000`

## Code Standards

- **TypeScript**: All new code should be written in TypeScript with proper interfaces.
- **Styling**: Use Tailwind CSS or Vanilla CSS. Maintain the Emerald/Zinc color scheme.
- **Components**: Place reusable components in `packages/ui`.
- **Commits**: Use descriptive commit messages (e.g., `feat: add live chat notifications`).

## Branching Strategy

- `main`: Stable production-ready code.
- `develop`: Ongoing development.
- `feature/*`: New features or enhancements.
- `bugfix/*`: Bug fixes.

## Submitting Pull Requests

1.  Create a branch from `develop`.
2.  Implement your changes and test them locally.
3.  Run `pnpm lint` to ensure code style consistency.
4.  Submit a PR to the `develop` branch with a clear description of your changes.
