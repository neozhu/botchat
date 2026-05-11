-- Track actual chat model token usage for messages and sessions.

alter table public.chat_messages
  add column if not exists total_tokens integer not null default 0 check (total_tokens >= 0);

alter table public.chat_sessions
  add column if not exists total_tokens integer not null default 0 check (total_tokens >= 0);

comment on column public.chat_sessions.total_tokens is
  'Sum of chat model token usage recorded on messages in this session. Excludes title and summary generation.';

comment on column public.chat_messages.total_tokens is
  'Actual chat model token usage for this message row. Assistant messages store response total usage; user messages default to 0.';

update public.chat_sessions
set total_tokens = coalesce(message_totals.total_tokens, 0)
from (
  select session_id, sum(total_tokens)::integer as total_tokens
  from public.chat_messages
  group by session_id
) as message_totals
where public.chat_sessions.id = message_totals.session_id;
