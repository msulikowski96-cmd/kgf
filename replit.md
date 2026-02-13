# KGF Taxi

## Overview
KGF Taxi is a React Native (Expo) mobile application with an Express.js backend. It provides taxi booking/ride services.

## Project Architecture
- **Frontend**: React Native with Expo (located in `client/`)
- **Backend**: Express.js with TypeScript (located in `server/`)
- **Database**: PostgreSQL with Drizzle ORM
- **Shared**: Shared schema and types (located in `shared/`)

## Tech Stack
- React Native / Expo SDK 54
- Express.js 5
- TypeScript
- Drizzle ORM for database
- TanStack React Query for data fetching
- Zod for validation
- JWT for authentication

## Project Structure
```
client/          - React Native frontend (screens, components, navigation)
server/          - Express backend (routes, auth, storage, templates)
shared/          - Shared schema (Drizzle schema, types)
migrations/      - Database migrations
scripts/         - Build scripts
assets/          - App assets (images, fonts)
```

## Key Scripts
- `npm run server:dev` - Start backend dev server (port 5000)
- `npm run expo:dev` - Start Expo dev server
- `npm run db:push` - Push database schema changes
- `npm run server:build` - Build server for production

## Recent Changes
- 2026-02-13: Initial import and environment setup
  - Fixed Windows-style scripts to Linux-compatible syntax
  - Installed npm dependencies
  - Provisioned PostgreSQL database
  - Pushed database schema

## User Preferences
- (none recorded yet)
