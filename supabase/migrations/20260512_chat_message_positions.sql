-- Persist explicit per-session message order to avoid relying on tied created_at timestamps.

alter table public.chat_messages
  add column if not exists position integer;

with ranked_messages as (
  select
    id,
    row_number() over (
      partition by session_id
      order by created_at asc, id asc
    ) - 1 as backfilled_position
  from public.chat_messages
)
update public.chat_messages
set position = ranked_messages.backfilled_position
from ranked_messages
where public.chat_messages.id = ranked_messages.id
  and public.chat_messages.position is null;

alter table public.chat_messages
  alter column position set default 0,
  alter column position set not null;

alter table public.chat_messages
  drop constraint if exists chat_messages_position_nonnegative;
alter table public.chat_messages
  add constraint chat_messages_position_nonnegative check (position >= 0);

comment on column public.chat_messages.position is
  'Zero-based message order within a session, assigned from the client conversation array so user/assistant turns remain stable even when rows are inserted concurrently.';

create index if not exists chat_messages_session_position_idx
  on public.chat_messages(session_id, position asc);

create index if not exists chat_messages_session_summarized_position_idx
  on public.chat_messages(session_id, summarized_at, position asc);
