# Developer & AI Skills Guidance (SKILLS.md)

This document outlines the specialized patterns and "skills" required to work effectively on the SnookerStream codebase.

## 1. Domain Knowledge: Snooker Scoring
Developers must understand the fundamental snooker scoring logic:
- **Fouls**: 4-7 points depending on the ball.
- **Frames**: Matches consist of frames (e.g., Best of 19).
- **Match Statuses**: `scheduled`, `live`, `paused`, `finished`.

## 2. Real-time Synchronization (Pusher)
When modifying match scores or status, ALWAYS ensure events are broadcasted to the correct channel:
- Channel naming convention: `match-{matchId}`
- Event types: `score-update`, `status-change`, `chat-message`.

## 3. Database Patterns
- **User Roles**: Strictly handle `admin`, `umpire`, and `user` roles in middleware and API routes.
- **Indexing**: Always check `Match.ts` and `ChatMessage.ts` for index patterns when adding new high-frequency query fields.

## 4. Performance Standards
- **Wait Times**: Use optimistic UI updates for scoring where possible.
- **Asset Loading**: Use Next.js `next/image` for player thumbnails.
- **API Efficiency**: Avoid "n+1" queries by using proper Mongoose `.populate()` calls if relational data grows.

## 5. UI/UX Consistency
- **Color Palette**: Stick to Emerald (`#10b981`) for success/primary actions and Zinc (`#18181b`) for backgrounds.
- **Animations**: Use subtle CSS transitions for hover states and `animate-pulse` for live status indicators.
