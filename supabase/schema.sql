-- Botchat (no-auth) schema for Supabase
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
  expert_id uuid not null references public.experts(id) on delete restrict,
  title text not null default 'New chat',
  last_message text
);

create index if not exists chat_sessions_updated_at_idx on public.chat_sessions(updated_at desc);
create index if not exists chat_sessions_expert_id_idx on public.chat_sessions(expert_id);

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

-- RLS (no auth): allow anon read/write explicitly.
alter table public.experts enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "anon read experts" on public.experts;
drop policy if exists "anon write experts" on public.experts;
create policy "anon read experts" on public.experts
  for select to anon using (true);
create policy "anon write experts" on public.experts
  for insert to anon with check (true);
create policy "anon update experts" on public.experts
  for update to anon using (true) with check (true);

drop policy if exists "anon read sessions" on public.chat_sessions;
drop policy if exists "anon write sessions" on public.chat_sessions;
create policy "anon read sessions" on public.chat_sessions
  for select to anon using (true);
create policy "anon write sessions" on public.chat_sessions
  for insert to anon with check (true);
create policy "anon update sessions" on public.chat_sessions
  for update to anon using (true) with check (true);

drop policy if exists "anon read messages" on public.chat_messages;
drop policy if exists "anon write messages" on public.chat_messages;
create policy "anon read messages" on public.chat_messages
  for select to anon using (true);
create policy "anon write messages" on public.chat_messages
  for insert to anon with check (true);
create policy "anon update messages" on public.chat_messages
  for update to anon using (true) with check (true);

