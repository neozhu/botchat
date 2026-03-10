# Server-First Botchat Bootstrap Design

**Date:** 2026-03-10

**Goal:** Move the initial botchat dashboard load to the server so the first page render includes experts, sessions, and the active session messages, while preserving client-side chat interactions.

## Scope

- Server-render the initial dashboard data in `app/page.tsx`.
- Keep `BotchatDashboard` as a client component for interactive chat behavior.
- Add caching aligned with data volatility:
  - `experts`: cross-request cache
  - initial sessions and active messages: fresh per request

## Why This Split

The current dashboard is a client component that loads experts, sessions, and initial messages in `useEffect`. That creates a client-side waterfall on first load. A server-first bootstrap removes that waterfall while still keeping `useChat`, composer state, hover interactions, and session switching on the client.

## Data Ownership

### Server

- Load experts for the sidebar presets and active bot metadata.
- Load the latest sessions for the left sidebar.
- Load the messages for the first active session, if one exists.
- Derive initial message timestamp lookup for date separators.

### Client

- Keep `useChat` and message streaming.
- Keep optimistic updates, session switching, deletion, uploads, and all hover/input UI state.
- Continue using the browser Supabase client after hydration for interactive mutations and follow-up reads.

## Caching Strategy

### Experts

Experts change rarely relative to chat activity, so they should use a cross-request cache with a short-to-medium revalidation window. This reduces redundant database reads on every page request.

### Sessions and Messages

Sessions and chat messages are highly volatile. They should remain effectively uncached at the cross-request level for correctness. Request-level deduplication is still acceptable, but stale multi-request caching is not appropriate for active chat data.

## Architecture

- Create a server data bootstrap helper under `lib/botchat/`.
- Move the expert seed metadata out of the client dashboard into a shared module so both server and client can reference it.
- Make `app/page.tsx` an async server component that awaits the bootstrap helper and passes typed initial props into `BotchatDashboard`.
- Refactor `BotchatDashboard` to initialize state from props and remove the current initial `useEffect` waterfall fetch.

## Non-Goals

- No rewrite of `useChat` to server actions.
- No change to message persistence or API route semantics.
- No broad auth or RLS redesign.

## Verification

- The home page should render with sessions and the first conversation already present on initial load.
- The client should still support switching sessions, sending messages, copying replies, and date separators.
- `npm run lint` and `npm run build` should pass after the refactor.
