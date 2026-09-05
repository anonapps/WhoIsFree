# Shared App Platform Architecture

## Backend model

All applications owned by this account use the same Supabase project where practical. Each application owns a dedicated PostgreSQL schema, while `shared` is reserved for genuinely cross-application infrastructure.

Current layout:

- `shared` — cross-application resources only.
- `whoisfree` — all WhoIsFree application data.

Future applications should follow the same pattern, for example `odometer`, `worldcup`, or another product-specific schema.

## Authentication

Supabase Auth is the shared identity layer. All authenticated applications must use the same `auth.users` identity rather than creating separate user stores.

`shared.user_profiles` is the common profile table. A database trigger creates a profile row automatically when a Supabase Auth user is created. The profile table is protected by RLS and users can only read/insert/update their own profile.

WhoIsFree remains anonymous and link-based; authentication is available as shared platform infrastructure but is not required by the product.

## Application isolation

Application tables must live in the application's schema. Do not place product-specific tables in `public`.

`public` may contain compatibility objects temporarily during migrations, but new application code must target its dedicated schema explicitly.

## Deployment model

- One GitHub repository per application.
- One Vercel project per application.
- One shared Supabase project where appropriate.
- Environment variables point each application to the shared Supabase project.
- Database changes are versioned as SQL migrations/scripts in the application's repository.

## Security

Every new application's tables must have RLS enabled before production use, with policies designed for that application's access model. Never enable RLS without first defining the required policies, because doing so can block application access.

Shared authenticated data must be protected by RLS and must not be exposed to the `anon` role unless a product explicitly requires it.

## New application checklist

1. Create a GitHub repository.
2. Create a Vercel project connected to that repository.
3. Create a dedicated Supabase schema in the shared project.
4. Add the schema to the PostgREST exposed schemas only when direct API access is required.
5. Create application tables and indexes in that schema.
6. Enable RLS and create explicit policies before production access.
7. Use the shared Supabase Auth identity when authentication is required.
8. Use `shared.user_profiles` for common user profile data rather than creating an application-specific user table.
9. Keep application-specific data out of `public`.
10. Add migrations to the repository.
11. Configure the application's Vercel environment variables to use the shared Supabase project.
12. Verify build, database access, authentication (when applicable), and production deployment before removing compatibility objects.
