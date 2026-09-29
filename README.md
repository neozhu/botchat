<div align="center">

# Botchat

**A clean, fast chat dashboard with expert personas, authenticated personal workspaces, streaming replies, attachments, and readable code blocks.**

[![CI](https://github.com/neozhu/botchat/actions/workflows/ci.yml/badge.svg)](https://github.com/neozhu/botchat/actions/workflows/ci.yml)

Built with **Next.js (App Router)** + **Vercel AI SDK** + **Supabase**.

</div>

![](/public/botchat-community-share.png)

## What you get

- **Expert personas**: switch between different “experts” with their own system prompts.
- **Supabase Auth**: sign up, sign in, sign out, and change password flows are built in.
- **Multi-session chat**: sessions list + titles + last-message preview.
- **User-isolated chat history**: sessions and messages are scoped to the authenticated user.
- **Streaming responses**: responsive UI while the model streams tokens.
- **Attachments**: upload images/files to Supabase Storage and send them with messages.
- **Markdown + code blocks**: readable rendering with syntax highlighting.

## Quickstart (local)

### 1) Configure env

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Required:

- `OPENAI_API_KEY` – your OpenAI API key
- `OPENAI_MODEL` – e.g. `gpt-5-mini` (model is not hardcoded in code)

Optional saved conversation summaries:

- `OPENAI_CONVERSATION_SUMMARY_MODEL` – model used for session title and context summary generation; falls back to `OPENAI_MODEL`
- `BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT` – despite the retained variable name, counts all user and assistant messages. It controls both the number of messages per saved summary batch and the maximum number of historical messages considered for relevance selection, excluding the current turn; defaults to `6` (normally three user/assistant turns). Set it to `8` for four turns.

After messages are saved, each full batch is summarized independently and marked as summarized. With a batch size of `6`, messages 1–6 form one summary and messages 7–12 form the next; incomplete batches wait for more messages. Each summary replaces the session's `context_summary` field without combining it with the previous summary. Summary generation uses only message count; the former `BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS` setting is ignored.

Optional history relevance routing:

- `TYPESAFE_API_KEY` – server-only TypeSafe key for Jev to evaluate each historical message within the configured conversation window against the current message
- `TYPESAFE_MODEL` – Jev model for history relevance evaluation; defaults to `jev-latest`

One Jev request batches an individual question for each historical message. Only messages with a Noul true probability of at least `0.9` are sent to the chat model, in chronological order; selecting one message does not include its entire turn or the other turns. Lower probabilities are treated as unrelated and discarded, without triggering fallback. Saved summaries are not sent to Jev or the chat model. If Jev fails, times out after 5 seconds, or its key is missing, the request includes only the previous conversation turn and the current message. Summary generation and message persistence continue regardless of this selection.

Supabase (recommended for sessions/experts/attachments):

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Supabase admin (required for expert deletion to remove all linked sessions/messages):

- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret; never expose to browser/client code)

### 2) Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Authentication UI is available at `http://localhost:3000/auth`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Enable Supabase Auth email/password sign-in for the project.
4. If email confirmation is enabled, new users must activate their account from email before signing in.
5. Create a public Storage bucket named `chat-attachments`.

The database schema now assumes authenticated access:

- `chat_sessions.user_id` owns each chat session.
- `chat_messages` inherit ownership through `session_id`.
- Row Level Security allows users to read/write only their own sessions and messages.
- `experts` remain global/shared and are not user-owned.

## Docker

This repo includes a production Docker build for the Next.js app:

```bash
docker compose up -d --build
```


App is exposed at `http://localhost:3202` (mapped from container `3000`).

Tip: for Docker envs, set `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_CONVERSATION_SUMMARY_MODEL`, `BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT`, `TYPESAFE_API_KEY`, `TYPESAFE_MODEL`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in your deployment platform or `docker-compose.yml`.

## Project structure

- `app/` – Next.js routes (UI + API routes)
- `components/botchat/` – chat UI (sessions, experts, input, panels)
- `components/ai-elements/` – AI-friendly UI primitives (rendering, message building blocks)
- `lib/` – shared utilities + Supabase clients
- `supabase/schema.sql` – database schema + RLS policies

## Common scripts

```bash
npm run dev       # local dev
npm run build     # production build
npm run start     # run production server on :3000
```
