# Server-First Botchat Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Render botchat with server-loaded initial experts, sessions, and active conversation data, while keeping client-side chat interactions and adding caching that matches each dataset's volatility.

**Architecture:** Introduce a server bootstrap layer that assembles initial dashboard data in `app/page.tsx` and passes it into the existing client dashboard as props. Cache low-volatility expert metadata across requests, but keep sessions and message history fresh per request to avoid stale chat state.

**Tech Stack:** Next.js App Router server components, React 19, TypeScript, Supabase JS, Vercel AI SDK `useChat`, Next cache utilities.

---

### Task 1: Extract shared expert seed and types

**Files:**
- Create: `lib/botchat/expert-seeds.ts`
- Modify: `components/botchat/dashboard.tsx`

**Step 1: Move expert seed metadata into a shared module**

- Export the seed list from `lib/botchat/expert-seeds.ts`.
- Keep the existing values unchanged.

**Step 2: Update the dashboard to consume the shared seed module**

- Replace the inline seed constant import in `components/botchat/dashboard.tsx`.

### Task 2: Build server bootstrap helpers with caching

**Files:**
- Create: `lib/botchat/bootstrap.ts`
- Modify: `lib/supabase/server.ts` only if helper ergonomics require it

**Step 1: Add typed server-side loaders**

- Load experts, sessions, and active-session messages.
- Build a message timestamp map keyed by `ui_message_id`.

**Step 2: Add cache policy by dataset**

- Use cross-request caching for experts.
- Keep sessions and messages fresh per request.
- Keep implementation explicit and local to the bootstrap module.

### Task 3: Move initial page load to the server

**Files:**
- Modify: `app/page.tsx`

**Step 1: Make the page async**

- Await the bootstrap helper in `app/page.tsx`.
- Pass initial data props to `BotchatDashboard`.

**Step 2: Preserve dynamic behavior where needed**

- Avoid page-level caching that would stale active sessions/messages.
- Let the bootstrap helper own the finer-grained caching decisions.

### Task 4: Refactor the client dashboard to hydrate from props

**Files:**
- Modify: `components/botchat/dashboard.tsx`

**Step 1: Add typed initial data props**

- Accept initial experts, sessions, messages, active ids, and timestamp map as props.

**Step 2: Initialize state from server props**

- Replace the initial empty-state defaults for these datasets with prop-driven initializers.

**Step 3: Remove the current initial `useEffect` waterfall**

- Keep only the client-side interaction flows after hydration.
- Preserve session switching, deletion, sending, uploads, date separators, and copy interactions.

### Task 5: Verify the refactor

**Files:**
- None (verification only)

**Step 1: Run lint**

Run: `npm run lint`
Expected: passes without new lint errors

**Step 2: Run production build**

Run: `npm run build`
Expected: server bootstrap and client hydration compile successfully

**Step 3: Manual behavior check**

- Initial page should load with data already present.
- Session switching should still fetch follow-up messages correctly.
- Sending a message should still update the active session and message list.
