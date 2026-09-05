# WhoIsFree

Anonymous group meeting scheduling with timezone-aware availability and preference voting.

## What it does

- Create a meeting without an account.
- Share a participant link.
- Let participants mark availability and preferred slots.
- Review aggregate results through the public event view.
- Use an admin link for organiser-only controls.
- Optional **Advanced Mode** lets the organiser inspect participant-level submissions.
- Events and participant data are automatically removed after the configured retention period.

## Architecture

- **Frontend / application:** Next.js + React + TypeScript
- **Hosting:** Vercel
- **Database / backend:** Supabase PostgreSQL
- **Authentication model:** intentionally account-free; access is based on event/admin tokens where required
- **Data protection:** PostgreSQL RLS plus narrowly scoped RPCs

The application is deliberately serverless and lightweight. There is no separate application server, cache cluster, queue, or dedicated database server to operate.

## Security model

Anonymous access is intentional, but database writes and sensitive reads are constrained by RLS and server-side validation. Privileged database implementations live in the private schema and are not exposed as PostgREST API endpoints; the public API surface consists of minimal anonymous wrappers.

Admin access uses a cryptographically generated 32-byte token represented as hexadecimal. Treat the admin URL as a secret: anyone possessing the admin token can access the organiser view.

## Local development

Requirements: Node.js and npm/pnpm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks before deployment:

```bash
npm run lint
npm run typecheck
npm run build
```

TypeScript errors are intentionally not ignored during production builds.

## Production configuration

The application requires the Supabase project URL and the publishable/anonymous client key used by the server-side Supabase client. Secrets must remain in Vercel environment variables and must never be committed to Git.

## Operational notes

- Expired events are purged opportunistically during server-side event creation.
- Event creation and vote submission are protected by application-level rate limiting.
- Database-level constraints provide a second validation layer for critical input fields.
- Supabase security and performance advisors should be checked after material schema changes.
- Unused-index notices are currently informational and should only be acted on after query-usage evidence is available.

## Privacy

WhoIsFree is designed around minimal data collection. No user account is required to schedule a meeting. Event, participant, and response data are ephemeral and subject to event deletion/retention rules.

## Deployment

The `main` branch is the production source of truth. Deploy through the connected Vercel project after validation passes.

## Status

This repository contains the production WhoIsFree application and its database integration. The project no longer depends on v0-specific workflows or documentation.
