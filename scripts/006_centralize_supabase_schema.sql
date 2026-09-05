-- Centralize application data in the shared Supabase project.
-- WhoIsFree owns the whoisfree schema; shared infrastructure can use shared.
-- This migration is intentionally additive/compatible: public views preserve
-- the legacy API while application code moves to the whoisfree schema.

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS whoisfree;

ALTER TABLE IF EXISTS public.events SET SCHEMA whoisfree;
ALTER TABLE IF EXISTS public.time_slots SET SCHEMA whoisfree;
ALTER TABLE IF EXISTS public.participants SET SCHEMA whoisfree;
ALTER TABLE IF EXISTS public.responses SET SCHEMA whoisfree;
ALTER TABLE IF EXISTS public.global_stats SET SCHEMA whoisfree;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, whoisfree';
NOTIFY pgrst, 'reload config';

-- Keep the old public object names available during the transition.
CREATE OR REPLACE VIEW public.events WITH (security_invoker = true) AS SELECT * FROM whoisfree.events;
CREATE OR REPLACE VIEW public.time_slots WITH (security_invoker = true) AS SELECT * FROM whoisfree.time_slots;
CREATE OR REPLACE VIEW public.participants WITH (security_invoker = true) AS SELECT * FROM whoisfree.participants;
CREATE OR REPLACE VIEW public.responses WITH (security_invoker = true) AS SELECT * FROM whoisfree.responses;
CREATE OR REPLACE VIEW public.global_stats WITH (security_invoker = true) AS SELECT * FROM whoisfree.global_stats;
