# WhoIsFree — Production Release Notes

This repository is the production source for WhoIsFree.

## Current production characteristics

- Anonymous meeting creation; no account required.
- Cryptographically generated admin tokens.
- Anonymous participant voting with server-side validation.
- Advanced Mode for organiser-visible participant-level submissions.
- Expired-event cleanup.
- Application-level rate limiting for event creation and vote submission.
- PostgreSQL RLS and constrained RPC access.
- Privileged database implementations kept in the private schema.

## Validation before deployment

```bash
npm run lint
npm run typecheck
npm run build
```

## Operational notes

- Production database migrations are tracked in Supabase.
- The application intentionally uses a lightweight Vercel + Supabase architecture.
- Do not commit Supabase service-role keys or other secrets.
- Security and performance advisors should be reviewed after material database changes.

## E2E validation

The core create-event → participant → vote → admin-result flow has been validated against the production Supabase schema using ten isolated test scenarios. Test data was rolled back after validation.
