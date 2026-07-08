-- Persist a rolling chat summary and its covered-message markers together.

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
