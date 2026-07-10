# Deploy Rolling Summary RPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the missing `public.persist_chat_context_summary` RPC and prove that PostgREST can resolve it without changing user data.

**Architecture:** Apply the repository's existing idempotent SQL through the Supabase migration API, then verify both the Postgres catalog and the Data API boundary. Keep the application RPC call unchanged because its named parameters already match the SQL signature.

**Tech Stack:** Supabase Postgres 17, PostgREST Data API, Supabase JavaScript client, Node.js 22, Next.js 16

## Global Constraints

- Target remote project `uvyznxymsghdduhvfwfn` (`botchat`).
- Preserve `SECURITY INVOKER`; do not add `SECURITY DEFINER`.
- Do not modify user rows during verification.
- Do not add an application fallback or change the chat and message-sync routes.
- Preserve the five RPC parameter names used by `lib/botchat/rolling-summary.ts`.
- Keep the existing `.codebase-memory/D-github-botchat.db` working-tree change uncommitted.

---

### Task 1: Deploy and verify transactional rolling-summary persistence

**Files:**
- Rename if required: `supabase/migrations/20260708_persist_chat_context_summary_rpc.sql`
- Test: `lib/botchat/rolling-summary.test.mts`

**Interfaces:**
- Consumes: `persistRollingConversationSummary` calls `supabase.rpc("persist_chat_context_summary", params)` with `p_session_id`, `p_context_summary`, `p_summarized_at`, `p_message_row_ids`, and `p_ui_message_ids`.
- Produces: `public.persist_chat_context_summary(uuid, text, timestamptz, uuid[], text[]) returns void` in the remote `public` schema.

- [ ] **Step 1: Preserve the failing remote reproduction**

Run this read-only SQL through `supabase_execute_sql`:

```sql
select
  n.nspname as schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'persist_chat_context_summary';
```

Expected before migration: zero rows. Also confirm `supabase_list_migrations` has no `persist_chat_context_summary_rpc` entry.

- [ ] **Step 2: Apply the existing migration through Supabase**

Call `supabase_apply_migration` with project ID `uvyznxymsghdduhvfwfn`, migration name `persist_chat_context_summary_rpc`, and this exact SQL:

```sql
create or replace function public.persist_chat_context_summary(
  p_session_id uuid,
  p_context_summary text,
  p_summarized_at timestamp with time zone,
  p_message_row_ids uuid[] default null,
  p_ui_message_ids text[] default null
)
returns void as $$
begin
  update public.chat_sessions
  set
    context_summary = p_context_summary,
    context_summary_updated_at = p_summarized_at
  where id = p_session_id;

  if p_message_row_ids is not null then
    update public.chat_messages
    set summarized_at = p_summarized_at
    where session_id = p_session_id
      and id = any(p_message_row_ids);
  end if;

  if p_ui_message_ids is not null then
    update public.chat_messages
    set summarized_at = p_summarized_at
    where session_id = p_session_id
      and ui_message_id = any(p_ui_message_ids);
  end if;
end;
$$ language plpgsql;
```

Expected: migration application succeeds once. Do not retry blindly if Supabase returns an error.

- [ ] **Step 3: Align the local migration version**

Call `supabase_list_migrations` and identify the newly returned version whose name is `persist_chat_context_summary_rpc`. If its version differs from the current local prefix `20260708`, rename the local SQL file so its numeric prefix exactly matches the remote version. Do not change the SQL body.

Expected: one local migration file and one remote migration record share the same version and name.

- [ ] **Step 4: Verify the Postgres function signature**

Run this read-only SQL through `supabase_execute_sql`:

```sql
select
  n.nspname as schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'persist_chat_context_summary';
```

Expected: exactly one row, five expected parameters, result type `void`, and `security_definer = false`.

- [ ] **Step 5: Verify PostgREST resolves the RPC without modifying data**

Run from the repository root. The random UUID is not a real session, so the function updates zero rows:

```powershell
node --env-file=.env.local --input-type=module -e 'import { createClient } from "@supabase/supabase-js"; const client = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY); const { error } = await client.rpc("persist_chat_context_summary", { p_session_id: "00000000-0000-0000-0000-000000000000", p_context_summary: "verification-only", p_summarized_at: new Date().toISOString(), p_message_row_ids: null, p_ui_message_ids: null }); if (error) { console.error(error.code, error.message); process.exit(1); } console.log("RPC resolved through PostgREST");'
```

Expected: `RPC resolved through PostgREST` and exit code 0. If the function exists in Step 4 but this call still reports a schema-cache miss, execute `notify pgrst, 'reload schema';` once through `supabase_execute_sql` and repeat this step.

- [ ] **Step 6: Run Supabase advisors**

Call `supabase_get_advisors` for both `security` and `performance` on project `uvyznxymsghdduhvfwfn`.

Expected: record any notices introduced by the DDL. Do not modify unrelated schema findings.

- [ ] **Step 7: Run local regression checks**

Run:

```powershell
node --experimental-strip-types --test lib/botchat/rolling-summary.test.mts
npm run lint
npm run build
```

Expected: the focused tests, lint, and build exit with code 0. Existing Node type-stripping and unrelated build warnings may remain.

- [ ] **Step 8: Review and commit local migration alignment**

Run:

```powershell
git diff --check
git status --short
git diff -- supabase/migrations docs/superpowers/plans/2026-07-10-deploy-rolling-summary-rpc.md
```

If Step 3 renamed the migration file, commit the rename and this completed plan. If no rename was required, commit only this completed plan. Do not stage `.codebase-memory/D-github-botchat.db`.
