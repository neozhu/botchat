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
- **English read-aloud**: the speaker action sends only English text from mixed Chinese/English replies to the speech API. It is disabled when no English is available; the server also filters and rejects Chinese-only input. Each blockquote in an assistant reply has its own read-aloud and copy actions, shown on hover, keyboard focus, or touch devices. Copy retains the full quote text, including Chinese; starting another read-aloud stops the previous one.
- **Attachments**: upload images/files to Supabase Storage and send them with messages.
- **Markdown + code blocks**: readable rendering with syntax highlighting.

## Architecture

Generated with [Archify](https://github.com/tt-a1i/archify) from the repository source. The diagram shows the server bootstrap, client chat flow, persistence, and external integrations.

![Botchat architecture: server bootstrap, two-panel chat dashboard, Next.js API routes, Supabase, and AI integrations](docs/architecture/botchat.svg)

[Interactive architecture diagram](.archify/architecture-botchat-20261005-065517/botchat.html) · [Diagram source](.archify/architecture-botchat-20261005-065517/candidate.json)

Download the HTML and open it in a browser to explore component details, pinned source links, themes, and image exports.

- **Server bootstrap**: `app/page.tsx` verifies the Supabase user and redirects guests to `/auth`. `lib/botchat/bootstrap.ts` loads experts, sessions, and the active conversation before rendering the dashboard.
- **Client chat flow**: `components/botchat/dashboard.tsx` coordinates `SessionsPanel`, `ChatPanel`, `useChat`, session switching, optimistic updates, uploads, and debounced message persistence. Chat rendering reuses `ai-elements` and shared `ui` components.
- **API and model context**: `/api/chat` resolves the expert prompt, model, and reasoning effort, loads referenced local skills, keeps the latest configured messages within a local token budget, and streams OpenAI replies. Separate routes handle sessions, experts, prompt generation, and configurable ASR/TTS services.
- **Persistence and attachments**: Supabase Postgres stores shared experts and user-owned sessions/messages protected by RLS. `/api/messages/sync` saves messages, titles, previews, token totals, and complete summary batches; saved summaries support session search and are excluded from chat context. `/api/attachments/upload` stores files in the public `chat-attachments` bucket and returns URLs before the client sends the message.

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
- `BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT` – despite the retained variable name, counts all user and assistant messages. It controls both the number of messages per saved summary batch and the maximum number of messages sent to the chat model, including the current user message; defaults to `6`.

After messages are saved, each full batch is summarized independently and marked as summarized. With a batch size of `6`, messages 1–6 form one summary and messages 7–12 form the next; incomplete batches wait for more messages. Each summary replaces the session's `context_summary` field without combining it with the previous summary. Summary generation uses only message count; `BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS` limits chat context and does not trigger summary generation.

Chat context limits:

- `BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT` – maximum recent messages, including the current user message; defaults to `6`. Counts individual user/assistant messages, not complete turns.
- `BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS` – local token budget for those messages; defaults to `20000`.

For each request, the server starts with the latest configured number of messages, then removes the oldest message one at a time (6 → 5 → 4 → …) until their estimated total is at most the token budget. The remaining messages keep their original order and content. There is no Jev/TypeSafe relevance call or API key requirement. Saved summaries are not added to the chat context, and summary generation and message persistence continue independently.

The current user message and any following tool continuation are always kept together, even if that current turn exceeds the message-count limit. If the current request alone exceeds the token budget, the API returns HTTP 413 asking the user to shorten it; it never silently drops or truncates the current request.

Token budgeting uses the local `o200k_base` tokenizer on each message's serialized role and parts, including text, file descriptors, and tool inputs/results. Stored usage metadata is ignored. This is an estimate for message content, not a cap on the provider's full input or billed usage: system/skill instructions, tool declarations, generated output, and provider-side image/PDF processing are outside this budget.

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

Typography uses a bundled Inter variable font for Latin text and Microsoft YaHei (微软雅黑) for Chinese when installed, followed by system font fallbacks. Font loading does not require access to Google Fonts during build or at runtime. The font source and SIL Open Font License are included in `public/fonts/inter/`.

App is exposed at `http://localhost:3202` (mapped from container `3000`).

Tip: for Docker envs, set `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_CONVERSATION_SUMMARY_MODEL`, `BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT`, `BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in your deployment platform or `docker-compose.yml`.

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
