# Botchat Dashboard Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Split `components/botchat/dashboard.tsx` into two coarse components: left Sessions sidebar and right Chat main window.

**Architecture:** Keep all data-fetching/state in `dashboard.tsx` and extract two presentational components that receive state + callbacks via props. Move chat-only UI helpers (`ToolbarIcon`, `MessageBubble`) into the Chat component to significantly reduce `dashboard.tsx` length without over-fragmenting.

**Tech Stack:** Next.js (client components), React, TypeScript, shadcn/ui sidebar, Vercel AI SDK `useChat`, Supabase browser client.

---

### Task 1: Create Sessions panel component

**Files:**
- Create: `components/botchat/sessions-panel.tsx`
- Modify: `components/botchat/dashboard.tsx`

**Step 1: Extract sidebar JSX into `SessionsPanel`**
- Move the entire `<Sidebar ...>...</Sidebar>` block into a new `SessionsPanel` component.
- Keep behavior in the parent by passing callbacks:
  - `onToggleSidebar()`
  - `onSelectSession(session)`
  - `onDeleteSession(session, event)` (or handle event in the component and call `onDeleteSession(session)`)

**Step 2: Ensure props cover all referenced state**
- `isLoadingSessions`, `sessions`, `activeSessionId`, `deletingSessionIds`, `removingSessionIds`, `nowMs`.
- `formatRelativeTime` passed from parent (or re-implemented locally if preferred).

---

### Task 2: Create Chat main window component

**Files:**
- Create: `components/botchat/chat-panel.tsx`
- Modify: `components/botchat/dashboard.tsx`

**Step 1: Extract `<SidebarInset ...>...</SidebarInset>` into `ChatPanel`**
- Move the entire right-side layout into a new `ChatPanel` component.
- Keep behavior in the parent by passing:
  - `onSubmit`
  - `input`, `setInput`
  - `messages`, `status`
  - `activeSession`, `activeExpert`, `experts`, `activeExpertId`, `isLoadingExperts`
  - `botName`, `botInitials`, `suggestionText`
  - `onCreateSessionForExpert(expertId)`

**Step 2: Move chat-only helpers**
- Move `ToolbarIcon` and `MessageBubble` implementations into `components/botchat/chat-panel.tsx`.

---

### Task 3: Wire components in `dashboard.tsx`

**Files:**
- Modify: `components/botchat/dashboard.tsx`

**Step 1: Add handler functions**
- `handleSelectSession(session)` (loads messages for the session).
- `handleDeleteSession(session, event?)` (deletes session + updates state).
- `handleCreateSessionForExpert(expertId)` (creates a new session for the selected expert).

**Step 2: Replace inline JSX with components**
- Render `<SessionsPanel ... />` for the left sidebar.
- Render `<ChatPanel ... />` for the right window.

---

### Task 4: Verification

**Files:**
- None (command-only)

**Step 1: Lint**
- Run: `bun run lint`
- Expected: no new lint/type errors introduced by the refactor.

