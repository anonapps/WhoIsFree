# Production Release 1.0.0 (Final Planned Release)

This repository is now prepared to ship the latest security and privacy changes as the **final planned release**.

## Included in this release

- ANONYMITY FAQ page and global footer link to improve transparency.
- Stronger admin access tokens (`32-byte` cryptographic hex token).
- Server-side rate limiting for event creation and vote submission.
- Expired-event purge support via SQL function and optional cron scheduling.

## Production rollout checklist

1. Apply SQL scripts in order:
   - `scripts/001_create_tables.sql` (new environments)
   - `scripts/002_add_maintenance_and_admin_token_updates.sql` (existing environments)
2. Set production Supabase and Next.js environment variables.
3. Build and deploy the app:
   - `npm run build`
   - `npm run start` (or your hosting platform deploy command)
4. Verify:
   - `/anonymity-faq` loads
   - event creation works
   - participant vote submission works
   - admin link opens with token key

## Notes

- If `pg_cron` is unavailable, expired events are still purged opportunistically by server actions before write operations.


Release marker: Final release commit prepared on main for deployment trigger.
