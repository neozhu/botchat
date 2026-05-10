-- Persist rolling summaries for long chat sessions and mark covered messages.

create extension if not exists pg_trgm with schema extensions;

alter table public.chat_sessions
  add column if not exists context_summary text,
  add column if not exists context_summary_updated_at timestamp with time zone;

alter table public.chat_messages
  add column if not exists summarized_at timestamp with time zone;

comment on column public.chat_sessions.context_summary is
  'Rolling summary of earlier chat messages that should be sent as model context instead of replaying summarized messages.';

comment on column public.chat_messages.summarized_at is
  'Set when this message has been folded into chat_sessions.context_summary and can be skipped for model context.';

create index if not exists chat_sessions_title_trgm_idx
  on public.chat_sessions using gin (title gin_trgm_ops);

create index if not exists chat_sessions_last_message_trgm_idx
  on public.chat_sessions using gin (last_message gin_trgm_ops)
  where last_message is not null;

create index if not exists chat_sessions_context_summary_trgm_idx
  on public.chat_sessions using gin (context_summary gin_trgm_ops)
  where context_summary is not null;

create index if not exists chat_messages_session_summarized_created_at_idx
  on public.chat_messages(session_id, summarized_at, created_at asc);
