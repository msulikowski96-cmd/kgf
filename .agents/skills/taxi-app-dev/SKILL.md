---
name: taxi-app-dev
description: Guidelines and best practices for developing the KGF Taxi application. Use when adding features or refactoring the taxi booking system.
---

# Taxi App Development Skill

This skill provides context and instructions for maintaining and extending the KGF Taxi application.

## Core Architecture
- **Frontend**: Expo (React Native) in `client/`
- **Backend**: Express in `server/`
- **Database**: PostgreSQL with Drizzle ORM
- **Shared**: Schema and types in `shared/schema.ts`

## Development Workflow
1. **Schema Changes**: 
   - Update `shared/schema.ts`
   - Run `npm run db:push` to sync database
2. **Backend**: 
   - Routes in `server/routes.ts`
   - Data access in `server/storage.ts`
3. **Frontend**: 
   - Screens in `client/screens/`
   - Components in `client/components/`
   - Navigation in `client/navigation/`

## Key Commands
- `npm run server:dev`: Starts backend (port 5000)
- `npm run expo:dev`: Starts Expo dev server
- `npm run db:push`: Synchronizes schema with DB

## Best Practices
- Use TanStack Query for data fetching on the frontend.
- Follow the established navigation patterns in `client/navigation/`.
- Ensure all API calls use the absolute URL (detected via DOMAIN env vars in Replit).
