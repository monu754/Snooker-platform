# Snooker Stream 🏆

A professional, real-time Snooker Tournament Management and Live Scoring platform built with Next.js, MongoDB, and Pusher.


## 🚀 Overview

Snooker Stream is a comprehensive solution for managing snooker tournaments, from match scheduling and umpire scoring to real-time viewer tracking. It provides a seamless, high-performance experience for admins, umpires, and viewers alike.

## ✨ Key Features

### 🛠 Admin Dashboard
- **Match Management**: Create, edit, and delete matches.
- **Player & User Management**: Control access levels and player profiles.
- **Real-time Overview**: Monitor all active frames and scores.
- **Match History**: Track past results with automated winner determination.

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

### 1. Prerequisites
- Node.js (>= 18)
- pnpm (Recommended)
- MongoDB instance (Local or Atlas)
- Pusher account for real-time features

### 2. Clone and Install
```bash
git clone https://github.com/monu754/Snooker-platform.git
cd snooker-platform
pnpm install
```

### 3. Environment Variables
Create an `apps/web/.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/snooker-platform

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here

# Pusher (For Real-time)
PUSHER_APP_ID=your_app_id
NEXT_PUBLIC_PUSHER_KEY=your_public_key
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
```

### 4. Run Locally
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

## 🗃 Database Schema

The platform uses a modular Mongoose schema:
- **Match**: Tracks players, scores, frames, status (live/finished), and winners.
- **User**: Handle authentication and roles (ADMIN, UMPIRE, VIEWER).
- **Event**: Detailed log of every point, foul, and match control action.
- **ChatMessage**: Real-time chat integration for viewers.

## 🤝 Contribution

1. Create a feature branch.
2. Ensure types are checked: `pnpm check-types`.
3. Open a Pull Request.

---
Built with ❤️ for the Snooker Community.
