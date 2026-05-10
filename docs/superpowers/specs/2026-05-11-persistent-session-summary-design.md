# Persistent Session Summary Design

## Goal

Persist rolling conversation summaries so long chat sessions can reuse compressed context instead of repeatedly sending or summarizing already-covered history.

## Architecture

Session-level context lives on `chat_sessions.context_summary`. Message coverage lives on `chat_messages.summarized_at`. The chat route reads the saved summary and filters request messages whose `ui_message_id` has already been summarized. Message sync remains the write boundary: after messages are upserted, it checks whether the unsummarized conversation has reached the fourth user message, summarizes the completed turns before the latest user message, updates the rolling session summary, and marks those message rows as summarized.

## Data Model

Add nullable columns:

- `chat_sessions.context_summary text`
- `chat_sessions.context_summary_updated_at timestamptz`
- `chat_messages.summarized_at timestamptz`

Add indexes for session search and unsummarized-message lookup:

- `chat_sessions_context_summary_idx` using trigram search where available
- `chat_messages_session_summarized_created_at_idx` on `(session_id, summarized_at, created_at)`

The existing RLS policies already permit authenticated users to update owned sessions and messages, so no new policies are required.

## Chat Request Flow

`app/api/chat/route.ts` continues to own model streaming. For session requests it loads the active expert prompt, the saved `context_summary`, and summarized message ids. Before calling the main model, it removes already-summarized UI messages from the request payload and appends the summary to system context.

The existing runtime compaction remains as a fallback for oversized unsummarized context and for the first request that crosses the threshold before sync has persisted a new summary.

## Sync Flow

`app/api/messages/sync/route.ts` remains responsible for durable message state. After upserting messages and updating title/last message, it loads unsummarized messages for the session in chronological order.

When there are at least four unsummarized user messages, it summarizes every unsummarized message before the latest unsummarized user message. This compresses the previous three completed user turns once the fourth user message has been sent, while leaving the current turn available verbatim. The summary prompt receives the previous `context_summary` plus the newly summarized transcript, then overwrites `chat_sessions.context_summary` with the new rolling summary and marks the summarized message rows with the same `summarized_at` timestamp.

If summary generation fails, message sync still returns success. The unsummarized rows remain unmarked, so a later sync can retry.

## Search

Session search becomes a single-table query against `chat_sessions`:

- `title`
- `last_message`
- `context_summary`

It no longer scans `chat_messages.content`, which keeps search cost tied to session count rather than message count.

## Testing

Unit tests cover:

- filtering already-summarized request messages
- appending saved summaries to model context
- deciding which unsummarized messages should be summarized when the fourth user message appears
- building a rolling summary prompt from prior summary plus new transcript
- ensuring search source no longer queries `chat_messages`

Route-level source tests continue to guard AI model helper usage and summary-model reasoning settings.
