-- Phase 1: Database schema + RLS foundation for user-scoped chat sessions.
-- Experts remain global/shared.
-- chat_messages remain owned indirectly through chat_sessions.session_id.
--
-- Compatibility note:
-- Existing chat_sessions rows will retain user_id = null after this migration.
-- The owner-based RLS policies below intentionally exclude those legacy rows.
-- Backfill or retire them before tightening chat_sessions.user_id to not null.

alter table public.chat_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

comment on column public.chat_sessions.user_id is
  'Authenticated owner of the chat session. Nullable temporarily for legacy anonymous rows until they are backfilled or retired.';

create index if not exists chat_sessions_user_id_updated_at_idx
  on public.chat_sessions(user_id, updated_at desc);

alter table public.experts enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "anon read experts" on public.experts;
drop policy if exists "anon write experts" on public.experts;
drop policy if exists "anon update experts" on public.experts;
drop policy if exists "anon delete experts" on public.experts;
drop policy if exists "authenticated read experts" on public.experts;
drop policy if exists "authenticated write experts" on public.experts;
drop policy if exists "authenticated update experts" on public.experts;
drop policy if exists "authenticated delete experts" on public.experts;

create policy "authenticated read experts" on public.experts
  for select to authenticated using (true);
create policy "authenticated write experts" on public.experts
  for insert to authenticated with check (true);
create policy "authenticated update experts" on public.experts
  for update to authenticated using (true) with check (true);
create policy "authenticated delete experts" on public.experts
  for delete to authenticated using (true);

drop policy if exists "anon read sessions" on public.chat_sessions;
drop policy if exists "anon write sessions" on public.chat_sessions;
drop policy if exists "anon update sessions" on public.chat_sessions;
drop policy if exists "anon delete sessions" on public.chat_sessions;
drop policy if exists "authenticated read own sessions" on public.chat_sessions;
drop policy if exists "authenticated insert own sessions" on public.chat_sessions;
drop policy if exists "authenticated update own sessions" on public.chat_sessions;
drop policy if exists "authenticated delete own sessions" on public.chat_sessions;

create policy "authenticated read own sessions" on public.chat_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "authenticated insert own sessions" on public.chat_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "authenticated update own sessions" on public.chat_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "authenticated delete own sessions" on public.chat_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "anon read messages" on public.chat_messages;
drop policy if exists "anon write messages" on public.chat_messages;
drop policy if exists "anon update messages" on public.chat_messages;
drop policy if exists "anon delete messages" on public.chat_messages;
drop policy if exists "authenticated read owned session messages" on public.chat_messages;
drop policy if exists "authenticated insert owned session messages" on public.chat_messages;
drop policy if exists "authenticated update owned session messages" on public.chat_messages;
drop policy if exists "authenticated delete owned session messages" on public.chat_messages;

create policy "authenticated read owned session messages" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );
create policy "authenticated insert owned session messages" on public.chat_messages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );
create policy "authenticated update owned session messages" on public.chat_messages
  for update to authenticated
  using (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );
create policy "authenticated delete owned session messages" on public.chat_messages
  for delete to authenticated
  using (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );
