# Auth + User-Isolated Chat Sessions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth and enforce per-user chat session isolation without redesigning the expert system or changing the existing chat architecture.

**Architecture:** Keep the existing server-first bootstrap and client-orchestrated chat flow, but make every server-side Supabase call auth-aware via `@supabase/ssr`, add route protection, and move chat ownership to `chat_sessions.user_id`. Enforce ownership in both RLS and application code, while leaving `experts` global and structurally unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, Vercel AI SDK, Supabase Postgres, Supabase Storage, Supabase Auth, `@supabase/ssr`, TypeScript.

---

## Chunk 1: Database and RLS Foundation

### Task 1: Add session ownership to the schema

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/<timestamp>_add_chat_session_ownership.sql` if the repo is moved to tracked migrations later; otherwise apply via SQL editor and keep `schema.sql` as source of truth

- [ ] **Step 1: Add `user_id` to `chat_sessions`**

Extend `public.chat_sessions` with:
- `user_id uuid references auth.users(id) on delete cascade`
- an index on `(user_id, updated_at desc)` for per-user session listing

- [ ] **Step 2: Keep `chat_messages` unchanged**

Do not add `user_id` to `chat_messages`. Ownership continues to flow through `session_id -> chat_sessions.user_id`.

- [ ] **Step 3: Make the migration transitional**

Add `user_id` as nullable first so production data can be migrated safely. Do not make it `not null` until legacy anonymous sessions are handled.

- [ ] **Step 4: Stage rollout before tightening RLS**

Before replacing anonymous session/message policies, choose one explicit rollout path:
- retire legacy anonymous sessions/messages first, then enable user-owned policies
- or temporarily keep a compatibility window only long enough to backfill/export legacy rows

Do not leave `user_id is null` rows in production while assuming the new owner-only policies are already the final state.

### Task 2: Replace anon RLS with authenticated ownership policies

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Keep `experts` global**

Update `experts` policies so reads remain global for signed-in users. Preserve the existing table shape and avoid introducing `user_id`.

- [ ] **Step 2: Lock `chat_sessions` to `auth.uid()`**

Add authenticated policies so:
- `select/update/delete` require `auth.uid() = user_id`
- `insert` requires `auth.uid() = user_id`

- [ ] **Step 3: Lock `chat_messages` through session ownership**

Add authenticated policies so message access is allowed only when an owning session exists:
- `select/update/delete/insert` use an `exists (...)` subquery against `public.chat_sessions`
- the subquery must require `chat_sessions.id = chat_messages.session_id` and `chat_sessions.user_id = auth.uid()`

### Task 3: Update storage policy assumptions

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Remove anon upload assumptions**

Replace the current anonymous upload policy for `chat-attachments` with authenticated-only upload rules.

- [ ] **Step 2: Bind object paths to user ownership**

Plan the storage path as `users/{userId}/sessions/{sessionId}/...` and write policies that validate the authenticated user against the first path segment.

- [ ] **Step 3: Decide on read policy**

For this auth rollout, explicitly treat attachment read privacy as out of scope unless the branch also implements signed/private attachment reads end to end. Even if object reads stay public temporarily, upload authorization must still validate both `userId` and `sessionId` server-side.

---

## Chunk 2: Supabase Auth Integration with `@supabase/ssr`

### Task 4: Introduce SSR auth clients

**Files:**
- Modify: `package.json`
- Replace: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/proxy.ts` or `lib/supabase/session.ts`
- Create: `proxy.ts`

- [ ] **Step 1: Add the dependency**

Add `@supabase/ssr` to the project.

- [ ] **Step 2: Replace the bare server client**

Replace the current `@supabase/supabase-js` server helper with an SSR server client that reads and writes auth cookies using Next.js server APIs.

- [ ] **Step 3: Add a browser client helper**

Create a client-side helper for auth UI work such as sign out, change password, and any client-only session refresh.

- [ ] **Step 4: Add the official cookie refresh layer**

Add `proxy.ts` using the official Supabase SSR pattern so auth cookies are refreshed during requests. Scope the matcher to application routes and auth routes, excluding static assets.

### Task 5: Add reusable auth primitives

**Files:**
- Create: `lib/auth/user.ts`
- Create: `lib/auth/guards.ts`

- [ ] **Step 1: Add a trusted current-user helper**

Create a helper that loads the authenticated user from the SSR Supabase client and returns a typed result for server components and route handlers.

- [ ] **Step 2: Add a route guard helper**

Create a helper that either returns the authenticated user or produces a consistent `401` response / redirect target.

- [ ] **Step 3: Keep auth concerns out of expert code**

Do not thread `userId` through expert models or expert table access. Experts remain global.

### Task 6: Add auth screens and flows

**Files:**
- Create: `app/auth/page.tsx` or `app/(auth)/auth/page.tsx`
- Create: `components/auth/auth-form.tsx`
- Create: `app/auth/actions.ts` or route handlers under `app/auth/*`
- Optional: `app/auth/confirm/route.ts` if email confirmation is enabled

- [ ] **Step 1: Add sign-in and sign-up UI**

Implement a minimal auth screen with sign-in and sign-up in the existing visual language.

- [ ] **Step 2: Choose a submission path**

Prefer server actions for sign-in/sign-up if they fit the current app cleanly; otherwise use route handlers. Keep the flow localized and avoid adding a global client auth provider unless necessary.

- [ ] **Step 3: Handle sign-up confirmation explicitly**

If Supabase email confirmation is enabled, add a confirm/callback route and UI copy for the pending-confirmation state. If it is disabled, redirect straight into the app after sign-up/sign-in.

---

## Chunk 3: Chat Ownership Enforcement

### Task 7: Make bootstrap and data access user-aware

**Files:**
- Modify: `lib/botchat/server-data.ts`
- Modify: `lib/botchat/bootstrap.ts`
- Modify: `lib/botchat/types.ts`

- [ ] **Step 1: Scope session reads by authenticated user**

Update `loadSessions()` to require an authenticated user and fetch only that user’s sessions.

- [ ] **Step 2: Scope message reads by owning session**

Update `loadMessagesForSession(sessionId)` so it validates the session belongs to the current user before returning messages.

- [ ] **Step 3: Scope session creation**

Update `createSessionForExpert(expertId)` so it inserts `user_id` from the authenticated Supabase user.

- [ ] **Step 4: Keep bootstrap behavior intact**

`getBotchatBootstrapData()` should still load experts globally, but sessions/messages only for the current user. If the user has no sessions, preserve the current empty-state behavior.

### Task 8: Enforce ownership in every session mutation

**Files:**
- Modify: `app/api/sessions/route.ts`
- Modify: `app/api/sessions/messages/route.ts`
- Modify: `app/api/messages/sync/route.ts`
- Modify: `app/api/sessions/delete/route.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/attachments/upload/route.ts`

- [ ] **Step 1: Require auth before DB access**

Every chat-related route must resolve the current user up front and return `401` when missing.

- [ ] **Step 2: Check session ownership explicitly**

For routes that accept `sessionId`, validate the session belongs to the current user before reading, updating, deleting, streaming, or uploading attachments.

- [ ] **Step 3: Preserve expert lookup behavior**

The `/api/chat` route should still read the session’s expert system prompt or the selected expert’s system prompt, but only after validating the user owns the target session.

- [ ] **Step 4: Update attachment object paths**

Write uploads to `users/{userId}/sessions/{sessionId}/...` and reject uploads for sessions the current user does not own.

### Task 9: Keep the client dashboard incremental

**Files:**
- Modify: `components/botchat/dashboard.tsx`

- [ ] **Step 1: Preserve existing chat UX**

Keep `useChat`, optimistic updates, and session switching structure intact.

- [ ] **Step 2: Handle unauthorized responses cleanly**

If the server returns `401` or ownership failures, clear local optimistic assumptions and redirect or reload into the auth flow instead of silently failing.

- [ ] **Step 3: Avoid redesigning expert interactions**

Do not change the expert selector model, expert shortcuts, or the expert settings dialog architecture as part of auth work.

---

## Chunk 4: Route Protection and Authorization

### Task 10: Protect top-level application routes

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Optional: create route groups if a small auth/app separation is cleaner

- [ ] **Step 1: Gate the main app server-side**

If the request is unauthenticated, redirect from the main app entry point to the auth page before loading chat bootstrap data.

- [ ] **Step 2: Keep the root layout minimal**

Only add auth-aware logic to `app/layout.tsx` if needed for shared navigation or session-driven UI. Avoid introducing a global provider unless a concrete use case requires it.

### Task 11: Add explicit authorization boundaries in server code

**Files:**
- Modify: `lib/botchat/server-data.ts`
- Create or modify: `lib/auth/guards.ts`

- [ ] **Step 1: Centralize “session belongs to user” checks**

Add one reusable helper to load or assert an owned chat session so the same rule is not reimplemented across route handlers.

- [ ] **Step 2: Prefer defense in depth**

Keep explicit owner checks in app code even though RLS also enforces access. This improves error handling and reduces accidental cross-session logic bugs.

---

## Chunk 5: Settings Integration and Change Password

### Task 12: Extend the existing Settings menu

**Files:**
- Modify: `components/botchat/sessions-panel.tsx`
- Create: `components/botchat/change-password-dialog.tsx`

- [ ] **Step 1: Reuse the current Settings footer entry**

Add nested items under the existing Settings menu instead of redesigning navigation.

- [ ] **Step 2: Add `Change password` as a dialog trigger**

Use the existing dialog pattern already established by `ExpertSettingsDialog` and the shared `components/ui/dialog.tsx` primitive.

- [ ] **Step 3: Add `Sign out` nearby**

Place sign-out in the same Settings area to keep account actions localized and avoid introducing a new top-level navigation pattern.

### Task 13: Implement change password flow

**Files:**
- Create: `components/botchat/change-password-dialog.tsx`
- Create or modify: `app/auth/actions.ts` or `app/api/auth/change-password/route.ts`
- Optional: `lib/auth/validation.ts`

- [ ] **Step 1: Add minimal password validation**

Validate current/new password fields at the UI boundary and server boundary. If current-password reauthentication is required by product policy, add it; otherwise rely on the active Supabase session and use `auth.updateUser({ password })`.

- [ ] **Step 2: Submit through an auth-aware server path**

Use a server action or route handler that resolves the current user and calls the appropriate Supabase Auth password update API.

- [ ] **Step 3: Provide inline success/error handling**

Keep the dialog self-contained with loading, error, and success states. Do not introduce a new page for password changes.

### Task 14: Implement sign-out flow in Settings

**Files:**
- Modify: `components/botchat/sessions-panel.tsx`
- Modify: `components/auth/auth-form.tsx` or create a shared auth action helper
- Create or modify: `app/auth/actions.ts` or `app/api/auth/sign-out/route.ts`

- [ ] **Step 1: Add a concrete sign-out action**

Implement a server-aware sign-out path that calls `supabase.auth.signOut()` using the SSR/browser client pattern that matches the rest of the auth flow.

- [ ] **Step 2: Clear protected app state after sign-out**

After sign-out, redirect or revalidate into the auth screen so the protected app bootstrap cannot continue rendering stale user-scoped data.

- [ ] **Step 3: Keep sign-out localized to Settings**

Expose the sign-out action from the existing Settings menu rather than adding a new navigation pattern.

---

## Chunk 6: Validation, Cleanup, and Data Migration

### Task 15: Migrate or retire anonymous session data

**Files:**
- Modify: `supabase/schema.sql`
- Create: `docs/plans/2026-03-11-auth-user-isolation-migration-notes.md` if rollout notes are needed

- [ ] **Step 1: Decide the legacy-data policy**

Because existing sessions have no user mapping, choose one of these before enforcing `user_id not null`:
- delete legacy anonymous sessions/messages
- archive them outside the app
- backfill them manually if a real owner mapping exists

- [ ] **Step 2: Sequence policy changes around that decision**

Only enable the final owner-only session/message RLS after the chosen legacy-data action has happened, or after a tightly scoped temporary compatibility policy has been removed.

- [ ] **Step 3: Only then tighten the column**

After legacy rows are handled, make `chat_sessions.user_id` `not null`.

### Task 16: Verify auth and authorization behavior

**Files:**
- Test: chat routes, auth flows, settings dialog flows

- [ ] **Step 1: Manual auth smoke test**

Verify:
- unauthenticated users are redirected away from the app
- sign-up/sign-in works
- sign-out clears access
- change password works with the current session behavior

- [ ] **Step 2: Manual ownership test**

With two users:
- user A cannot see user B sessions in bootstrap
- user A cannot load/delete/update user B sessions by direct API calls
- message sync fails for cross-user session IDs
- attachment upload fails for cross-user session IDs

- [ ] **Step 3: Regression test expert behavior**

Verify experts still load globally and expert CRUD/reorder/generation still uses the same table and architecture.

- [ ] **Step 4: Run repository verification**

Run the smallest relevant checks:
- `bun lint`
- `bun run build`
- targeted route or helper tests added during implementation

### Task 17: Commit in small reviewable phases

**Files:**
- All files touched in the corresponding phase

- [ ] **Step 1: Commit Phase 1**

Example: `feat: add chat session ownership schema and rls`

- [ ] **Step 2: Commit Phase 2**

Example: `feat: add supabase auth integration`

- [ ] **Step 3: Commit Phase 3-4**

Example: `feat: enforce user-scoped chat access`

- [ ] **Step 4: Commit Phase 5**

Example: `feat: add account settings and change password dialog`

- [ ] **Step 5: Commit Phase 6**

Example: `chore: verify auth rollout and clean up edge cases`

---

## Implementation Notes

- Keep `experts` global and structurally unchanged.
- Do not add `user_id` to `experts`.
- Prefer not adding `user_id` to `chat_messages`.
- Do not redesign `components/botchat/dashboard.tsx`; layer auth and ownership around its existing flow.
- Prefer server-side redirects and authorization over client-only guards.
- Follow official Supabase SSR guidance for App Router cookie handling and session refresh.
- Treat attachment privacy as a conscious follow-up decision if the bucket remains public.
