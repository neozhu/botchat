-- Botchat schema for Supabase.
-- Experts remain global/shared.
-- Chat sessions become user-owned through public.chat_sessions.user_id.
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.experts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  slug text not null unique,
  name text not null,
  agent_name text not null,
  description text,
  system_prompt text not null,
  suggestion_question text,
  sort_order integer not null default 0
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete restrict,
  title text not null default 'New chat',
  last_message text
);

create index if not exists chat_sessions_updated_at_idx on public.chat_sessions(updated_at desc);
create index if not exists chat_sessions_expert_id_idx on public.chat_sessions(expert_id);
create index if not exists chat_sessions_user_id_updated_at_idx
  on public.chat_sessions(user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  ui_message_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text,
  parts jsonb not null default '[]'::jsonb
);

create unique index if not exists chat_messages_session_ui_message_id_uniq
  on public.chat_messages(session_id, ui_message_id);

create index if not exists chat_messages_session_created_at_idx
  on public.chat_messages(session_id, created_at asc);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.chat_sessions;
create trigger set_updated_at
  before update on public.chat_sessions
  for each row
  execute function public.handle_updated_at();

comment on column public.chat_sessions.user_id is
  'Authenticated owner of the chat session. Nullable temporarily for legacy anonymous rows until they are backfilled or retired.';

-- RLS.
-- Compatibility note:
-- Existing anonymous chat_sessions rows will keep user_id = null after upgrade.
-- The owner-based policies below intentionally exclude those rows. They must be
-- backfilled or retired before user_id is tightened to not null in a later phase.
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



-- Storage policies for public `chat-attachments` bucket.
-- Run after creating the bucket in Storage.
drop policy if exists "anon read chat attachments" on storage.objects;
drop policy if exists "anon upload chat attachments" on storage.objects;
drop policy if exists "authenticated read chat attachments" on storage.objects;
drop policy if exists "authenticated upload chat attachments" on storage.objects;
create policy "anon read chat attachments" on storage.objects
  for select to anon
  using (bucket_id = 'chat-attachments');

create policy "anon upload chat attachments" on storage.objects
  for insert to anon
  with check (bucket_id = 'chat-attachments');

create policy "authenticated read chat attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-attachments');

create policy "authenticated upload chat attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-attachments');
