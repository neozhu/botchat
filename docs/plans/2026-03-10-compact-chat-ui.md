# Compact Chat UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make the botchat workspace noticeably more compact by reducing whitespace in the sessions sidebar and chat panel, while changing the composer to a one-line default textarea that auto-expands with content.

**Architecture:** Keep the current two-panel dashboard structure and existing chat/session behavior intact. Apply a localized density pass in the presentational components and add textarea auto-sizing in the chat composer without changing the dashboard state model.

**Tech Stack:** Next.js client components, React 19, TypeScript, Tailwind CSS v4, shadcn/ui primitives, Vercel AI SDK chat state.

---

### Task 1: Capture a clean baseline in the worktree

**Files:**
- None (verification only)

**Step 1: Inspect the worktree status**

Run: `git status --short`
Expected: clean worktree before feature changes

**Step 2: Run lint before changes**

Run: `npm run lint`
Expected: existing codebase passes, or any pre-existing failures are identified before feature work

### Task 2: Compact the sessions sidebar density

**Files:**
- Modify: `components/botchat/sessions-panel.tsx`

**Step 1: Reduce sidebar header spacing**

- Lower header gap and padding.
- Keep the current `Sessions` label, count badge, and toggle button.

**Step 2: Reduce session card height and internal spacing**

- Lower the session card minimum height and padding.
- Tighten avatar, text stack, timestamp spacing, and delete button positioning.
- Preserve active, hover, and collapsed sidebar states.

**Step 3: Tighten footer settings spacing**

- Reduce footer padding and settings row height while preserving the existing interaction.

### Task 3: Compact the chat panel density

**Files:**
- Modify: `components/botchat/chat-panel.tsx`

**Step 1: Reduce page and panel spacing**

- Lower `SidebarInset` padding and main panel internal spacing.
- Keep the current panel shape, border, and shadow style.

**Step 2: Reduce header and meta section height**

- Keep `Active chat` as a single-line label.
- Keep the chat title on one line and pull preset metadata closer.
- Tighten the divider row around `Chat started`.

**Step 3: Reduce message area whitespace**

- Lower top and bottom padding in the conversation content.
- Reposition prompt suggestion and empty-state spacing to sit higher in the viewport.

### Task 4: Implement one-line composer with auto-growth

**Files:**
- Modify: `components/botchat/chat-panel.tsx`

**Step 1: Add textarea measurement logic**

- Track the textarea element with a ref.
- Reset height to a one-line baseline before reading `scrollHeight`.
- Apply the measured height whenever the input value changes.

**Step 2: Tighten composer container spacing**

- Reduce composer padding, textarea spacing, toolbar spacing, and attachment section spacing.
- Keep the toolbar and send button layout stable.

**Step 3: Preserve existing input semantics**

- Keep `Enter` to submit.
- Keep `Shift+Enter` to add a newline.
- Preserve disabled/uploading behaviors.

### Task 5: Verify the compact UI changes

**Files:**
- None (verification only)

**Step 1: Run lint after changes**

Run: `npm run lint`
Expected: passes without introducing new lint errors

**Step 2: Perform targeted manual verification**

- Confirm the sessions sidebar is visually denser without clipping text.
- Confirm the chat header and divider occupy less height.
- Confirm the composer starts at one line, grows for multi-line content, and shrinks after deletions.
- Confirm the send-on-enter behavior still works.
