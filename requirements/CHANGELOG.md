# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-17
### Added
- **Profile Page**: Comprehensive user profile management (name and password updates).
- **Core API**: New `/api/user/profile` endpoint for secure updates.
- **UI Enhancements**: Professional profile icon and user info display in the main header.
- **Scalability Optimizations**: Added database indices to `Match` and `ChatMessage` models for high-performance query execution.

### Changed
- Standardized the home page header to use a dynamic profile dropdown instead of a plain-text username.
- Improved database connection reliability with enhanced caching logic.

## [1.0.0] - 2026-03-10
### Added
- Initial release of the SnookerStream platform.
- Real-time scoring system powered by Pusher.
- Role-based access for Admin, Umpire, and User.
- NextAuth integration for Google and Email/Password login.
- Live match carousel and scheduled match views.
