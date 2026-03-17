# SnookerStream - The Professional Snooker Streaming Platform

SnookerStream is a high-performance, real-time snooker match tracking and live streaming platform. Designed for both professional tournaments and community games, it provides a sleek, modern interface for viewers and powerful tools for umpires and admins.

## 🚀 Key Features

- **Live Real-time Scoring**: Instant score updates powered by Pusher.
- **Dynamic Profile Management**: Professional account settings for name and password.
- **Umpire Dashboard**: Specialized interface for match officiating and scoring.
- **Admin Panel**: Comprehensive match scheduling and tournament management.
- **Scalable Architecture**: Built on Next.js 15+ and MongoDB with optimized performance indices.
- **Responsive & Aesthetic**: Dark-themed UI with emerald accents, optimized for all devices.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB (Mongoose)
- **Real-time**: Pusher
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS & Lucide React
- **Package Manager**: pnpm

## 📦 Monorepo Structure

```text
├── apps
│   ├── web      # Main Next.js application
│   └── docs     # Documentation (optional)
├── packages
│   ├── ui       # Shared UI components
│   └── configs  # Shared TS/ESLint configs
└── ...
```

## 🏁 Getting Started

```bash
# Clone the repository
git clone https://github.com/monu754/snooker-platform.git

# Install dependencies
pnpm install

# Set up environment variables (.env.local in apps/web)
MONGODB_URI=...
NEXTAUTH_SECRET=...
PUSHER_APP_ID=...
# etc.

# Run the development server
pnpm dev
```

## 📚 Documentation

- [Architecture Overview](/requirements/ARCHITECTURE.md)
- [API Documentation](/requirements/API.md)
- [Project Roadmap](/requirements/ROADMAP.md)
- [Contributing Guide](/requirements/CONTRIBUTING.md)
- [Skill Patterns](/requirements/SKILLS.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ by the SnookerStream Team.
