# Snooker Stream 🏆

A professional, real-time Snooker Tournament Management and Live Scoring platform built with Next.js, MongoDB, and Pusher.


## 🚀 Overview

Snooker Stream is a comprehensive solution for managing snooker tournaments, from match scheduling and umpire scoring to real-time viewer tracking. It provides a seamless, high-performance experience for admins, umpires, and viewers alike.

## ✨ Key Features

### 🛠 Admin Dashboard
- **Match Management**: Create, edit, and delete matches.
- **Player & User Management**: Control access levels and player profiles.
- **Premium Viewer Plans**: Viewer accounts can upgrade to Plus or Pro, while admin and umpire accounts stay role-based.
- **Real-time Overview**: Monitor all active frames and scores.
- **Match History**: Track past results with automated winner determination.
- **Refined Activity Feed**: High-level administrative audit log (Logins, Match Deletions, User Updates) filtered specifically for admins.

### 📧 Automated Notifications
- **Umpire Welcome**: New umpires automatically receive an email with their login credentials and mandatory password change instructions.
- **Match Assignment**: Umpires are instantly notified via email when assigned to a new or existing match.

### ⚖️ Umpire Scoring Panel
- **Point Tracking**: Simple, intuitive point buttons.
- **Foul Management**: Detailed foul buttons for professional match standards.
- **Auto-Conclusion**: Matches automatically finish when a player reaches the required number of frames.
- **Real-time Logging**: Every score and foul is logged and broadcasted instantly.

### 📺 Viewer Experience
- **Hero Banner**: Dynamic spotlight on live matches with high-contrast UI.
- **Completed Matches**: History section showing the last 20 finished games.
- **Real-time Sync**: Watch scores and events update instantly without refresh.
- **Winner Highlights**: Visual distinction for match winners with trophy icons.
- **Premium Upgrades**: Viewer profile supports paid-plan checkout integration for premium viewing features.

### 📢 Platform Announcements
- **Global Banner**: Admins can broadcast real-time messages to all active users.
- **Real-time Sync**: Instant appearance and updates powered by Pusher.
- **Dismissible UI**: Clean, high-contrast banner that users can opt to hide locally.

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Monorepo Management**: [TurboRepo](https://turbo.build/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Real-time**: [Pusher](https://pusher.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: TypeScript
- **Operations**: GitHub Actions CI, Docker, Docker Compose

## 📁 Project Structure

```text
snooker-platform/
├── apps/
│   └── web/                # Main Next.js application
│       ├── app/            # Next.js App Router (Admin, Umpire, Watch, API)
│       ├── components/     # Reusable UI components
│       ├── lib/            # Shared utilities and Database models
│       ├── public/         # Static assets and uploads
│       └── ...
├── requirements/           # Project roadmap and technical specs
├── turbo.json              # TurboRepo configuration
└── package.json            # Scripts and shared dependencies
```

## ⚙️ Setup & Installation

Follow these steps to set up the project on a new device.

### 1. Prerequisites

Before you begin, ensure you have the following installed:
- **Git**: [Download and Install Git](https://git-scm.com/downloads)
- **Node.js**: (Version 18 or higher) [Download Node.js](https://nodejs.org/)
- **pnpm**: We use `pnpm` for package management. Install it globally via npm:
  ```bash
  npm install -g pnpm
  ```
- **MongoDB**: You need a running MongoDB instance.
  - **Local**: [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - **Cloud**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Pusher Account**: Required for real-time scoring. Create a free account at [Pusher](https://pusher.com/).

### 2. Clone the Repository

Open your terminal and run:
```bash
git clone https://github.com/monu754/Snooker-platform.git
cd snooker-platform
```

### 3. Install Dependencies

Install all required packages using `pnpm`:
```bash
pnpm install
```

### 4. Configuration (Environment Variables)

The application requires several environment variables to function correctly.

1. Navigate to the web app directory:
   ```bash
   cd apps/web
   ```
2. Create a file named `.env.local`:
   ```bash
   cp .env.example .env.local  # If .env.example exists, otherwise create new
   ```
3. Open `apps/web/.env.local` and fill in your credentials:

```env

# Copy the keys from your Google Cloud Console tab
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret_key

# Database Connection
MONGODB_URI=mongodb://localhost:27017/snooker-platform
# OR Atlas: MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/snooker_platform

# NextAuth Configuration
# Generate a secret: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# Pusher Configuration (Get these from your Pusher Dashboard)
PUSHER_APP_ID=your_app_id
NEXT_PUBLIC_PUSHER_KEY=your_public_key
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# Email Notifications (SMTP - e.g., Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Snooker Platform" <your_email@gmail.com>
SMTP_SECURE=false
```

### 5. Start Developing

Go back to the root directory and start the development server:
```bash
cd ../..
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Optional: Run With Docker Compose

From the project root:

```bash
docker compose up --build
```

This starts MongoDB and the web app together for a reproducible local deployment flow.

## 🗃 Database Schema

The platform uses a modular Mongoose schema:
- **Match**: Tracks players, scores, frames, status (live/finished), and winners.
- **User**: Handle authentication and roles (ADMIN, UMPIRE, VIEWER).
- **Event**: Detailed log of every point, foul, and administrative action. Classified by `category` (admin/match) for dashboard filtering.
- **ChatMessage**: Real-time chat integration for viewers.

## 🤝 Contribution

1. Create a feature branch.
2. Ensure types are checked: `pnpm check-types`.
3. Open a Pull Request.

---
Built with ❤️ for the Snooker Community.
