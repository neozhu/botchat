# Expert Dialog Reuse Bootstrap Experts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the expert settings dialog reuse the dashboard's existing expert list on open instead of always issuing a fresh `/api/experts` request.

**Architecture:** Keep the current client-side dialog editing model, but thread the already-bootstrapped `experts` state from the dashboard into the sessions panel and expert dialog. Add a small pure helper in `lib/botchat/expert-settings.ts` that resolves the dialog's source list and selected expert so the new behavior is testable with the existing Node test setup.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Node test runner via `bun test`

---

### Task 1: Add test coverage for prop-driven dialog source resolution

**Files:**
- Modify: `lib/botchat/expert-settings.ts`
- Modify: `lib/botchat/expert-settings.test.mts`

- [ ] **Step 1: Write the failing test**

Add tests for a helper that prefers externally provided experts when opening the dialog and resolves the selected expert ID from that source.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/botchat/expert-settings.test.mts`
Expected: FAIL because the new helper is not implemented/exported yet.

- [ ] **Step 3: Write minimal implementation**

Implement the helper in `lib/botchat/expert-settings.ts` and keep it focused on source selection plus selected-id resolution.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/botchat/expert-settings.test.mts`
Expected: PASS.

### Task 2: Thread expert data through the dialog without an initial fetch

**Files:**
- Modify: `components/botchat/dashboard.tsx`
- Modify: `components/botchat/sessions-panel.tsx`
- Modify: `components/botchat/expert-settings-dialog.tsx`

- [ ] **Step 1: Pass the existing `experts` state down from the dashboard**

Add an `experts` prop to `SessionsPanel`, then pass it through to `ExpertSettingsDialog`.

- [ ] **Step 2: Update the dialog to initialize and sync from props**

Initialize local expert state from the passed-in list and, on open, sync from props instead of fetching when external experts are available.

- [ ] **Step 3: Keep API fetch as a fallback only**

Retain the current `loadExperts()` behavior for cases where no external experts were supplied.

- [ ] **Step 4: Run focused verification**

Run: `bun test lib/botchat/expert-settings.test.mts`
Expected: PASS.

### Task 3: Run broader verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run build verification**

Run: `bun run build`
Expected: successful production build with no new TypeScript errors.
