<div align="center">

# Botchat

**A clean, fast chat dashboard with expert personas, streaming replies, attachments, and readable code blocks.**

Built with **Next.js (App Router)** + **Vercel AI SDK** + **Supabase**.

</div>

![](/docs/screenshot.png)

## What you get

- **Expert personas**: switch between different “experts” with their own system prompts.
- **Multi-session chat**: sessions list + titles + last-message preview.
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

Supabase (recommended for sessions/experts/attachments):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required for attachment uploads + message persistence routes)

### 2) Run

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor (this project uses a simple “no-auth” RLS policy for anon read/write).
3. (Optional) Attachments are stored in a public bucket named `chat-attachments` and created automatically on first upload.

## Docker

This repo includes a production Docker build for the Next.js app:

```bash
docker compose up -d --build
```

App is exposed at `http://localhost:3202` (mapped from container `3000`).

Tip: for Docker envs, set `OPENAI_API_KEY`, `OPENAI_MODEL`, and your Supabase vars in your deployment platform or `docker-compose.yml`.

## Project structure

- `app/` – Next.js routes (UI + API routes)
- `components/botchat/` – chat UI (sessions, experts, input, panels)
- `components/ai-elements/` – AI-friendly UI primitives (rendering, message building blocks)
- `lib/` – shared utilities + Supabase clients
- `supabase/schema.sql` – database schema + RLS policies

## Common scripts

```bash
bun dev       # local dev
bun run build # production build
bun start     # run production server on :3000
```
