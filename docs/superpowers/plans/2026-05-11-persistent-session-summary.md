# Persistent Session Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist rolling chat summaries and skip already-summarized history in future model requests.

**Architecture:** Add session summary columns and per-message summary markers. `/api/chat` reads saved summary state and filters summarized request messages; `/api/messages/sync` updates the rolling summary after durable message upsert. Session search moves to a single-table query over title, last message, and summary.

**Tech Stack:** Next.js App Router, AI SDK 6, Supabase, TypeScript, Bun test runner via `node:test`.

---

### Task 1: Schema

**Files:**
- Create: `supabase/migrations/20260511_persistent_session_summary.sql`
- Modify: `supabase/schema.sql`

- [ ] Add nullable summary columns to `chat_sessions`.
- [ ] Add nullable summary marker to `chat_messages`.
- [ ] Add indexes for summary search and unsummarized message lookup.

### Task 2: Context Helpers

**Files:**
- Modify: `lib/botchat/chat-context.ts`
- Modify: `lib/botchat/chat-context.test.mts`

- [ ] Add helpers to filter summarized messages by `ui_message_id`.
- [ ] Add helper to append saved `context_summary` to system context.
- [ ] Add helper to choose messages before the latest unsummarized user message once four unsummarized users exist.
- [ ] Add tests for each helper.

### Task 3: Chat Route

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/chat/route.test.mts`

- [ ] Load `context_summary` and summarized message ids for the session.
- [ ] Filter summarized UI messages before runtime compaction.
- [ ] Append saved summary to the system prompt.
- [ ] Preserve current runtime compaction fallback and summary model helper.

### Task 4: Message Sync Summary Persistence

**Files:**
- Modify: `app/api/messages/sync/route.ts`
- Modify: `app/api/messages/sync/route.test.mts`

- [ ] After message upsert, load session summary plus unsummarized messages.
- [ ] When the fourth unsummarized user message appears, summarize rows before that latest user message.
- [ ] Update `chat_sessions.context_summary` and `context_summary_updated_at`.
- [ ] Mark summarized message rows with `summarized_at`.
- [ ] Keep sync successful if summary generation fails.

### Task 5: Search

**Files:**
- Modify: `lib/botchat/server-data.ts`
- Modify: `lib/botchat/types.ts`
- Modify: `lib/botchat/server-data.test.mts`

- [ ] Include `context_summary` in session selects and `SessionRow`.
- [ ] Replace message-content search with a single `chat_sessions` query over `title`, `last_message`, and `context_summary`.
- [ ] Add source-level regression tests that `searchSessions` no longer queries `chat_messages`.

### Task 6: Verification

**Commands:**
- `bun test lib/botchat/chat-context.test.mts app/api/messages/sync/route.test.mts app/api/chat/route.test.mts lib/botchat/server-data.test.mts`
- `bun lint`
- `bun run build`

Expected result: all commands pass. If Supabase CLI remains unavailable, migration creation is verified by file review rather than `supabase migration list`.
