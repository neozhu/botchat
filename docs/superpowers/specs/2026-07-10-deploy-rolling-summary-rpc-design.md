# Deploy Rolling Summary RPC Design

## Goal

Restore rolling conversation summary persistence by deploying the missing `public.persist_chat_context_summary` function to the configured Supabase project.

## Root Cause

Application code and `supabase/schema.sql` agree on the five named RPC parameters. The configured remote project already has the rolling-summary columns, but it has neither the function in `pg_proc` nor the corresponding migration in `supabase_migrations.schema_migrations`.

The failure is deployment drift: commit `0b6c6be` added `supabase/migrations/20260708_persist_chat_context_summary_rpc.sql`, but that migration was not applied to the remote database. A schema-cache reload alone cannot resolve a function that does not exist.

## Change

Apply the existing migration SQL through the Supabase migration API. The function remains `SECURITY INVOKER` and performs the session-summary update and covered-message marker updates in one transaction.

After the migration is applied:

1. Read the remote migration version created by Supabase.
2. Align the local migration filename with that remote version if they differ, so future migration comparisons do not retain avoidable drift.
3. Refresh the PostgREST schema cache only if the function exists in Postgres but the Data API still cannot resolve it.

No application fallback or route change will be added. A fallback would hide migration failures and lose the RPC's atomic update boundary.

## Verification

Verification must avoid modifying user data:

- query `pg_proc` and confirm the exact five-parameter function signature;
- confirm the migration appears in remote migration history;
- call the RPC through the Supabase Data API with a random nonexistent session UUID and null marker arrays, which should update zero rows and return without a schema-cache error;
- run `lib/botchat/rolling-summary.test.mts`;
- run lint and the production build;
- run Supabase security and performance advisors after the DDL change.

## Scope

- Remote project: `uvyznxymsghdduhvfwfn` (`botchat`).
- Local scope: only the existing rolling-summary migration filename if version alignment is required, plus this design and its implementation plan.
- No changes to `lib/botchat/rolling-summary.ts`, chat routes, API response behavior, RLS policies, or dependencies.

## Risk

The migration changes the remote database schema. Its SQL is idempotent (`create or replace function`) and does not rewrite existing rows. The verification RPC uses a nonexistent session ID, so it has no data side effects.
