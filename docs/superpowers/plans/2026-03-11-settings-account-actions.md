# Settings Account Actions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Change password` and `Log out` actions under the existing sidebar Settings menu without changing the expert ownership model or creating a new account page.

**Architecture:** Keep the existing `SessionsPanel` Settings collapsible as the entry point. Add a focused password dialog component that posts to a server action in `app/auth/actions.ts`, and reuse the existing sign-out action for logout.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR, shadcn/ui dialog primitives, node:test

---

### Task 1: Lock password-change rules with tests

**Files:**
- Create: `lib/auth/change-password.ts`
- Create: `lib/auth/change-password.test.mts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Add server action for password updates

**Files:**
- Modify: `app/auth/actions.ts`
- Modify: `lib/auth/change-password.ts`
- Test: `lib/auth/change-password.test.mts`

- [ ] **Step 1: Add failing cases for action-facing validation outputs if needed**
- [ ] **Step 2: Run the targeted test**
- [ ] **Step 3: Add `changePasswordAction` using Supabase SSR server client**
- [ ] **Step 4: Re-run the targeted test**

### Task 3: Add Settings account UI

**Files:**
- Create: `components/botchat/change-password-dialog.tsx`
- Modify: `components/botchat/sessions-panel.tsx`

- [ ] **Step 1: Add a failing view-state test for the dialog helper**
- [ ] **Step 2: Run the targeted test**
- [ ] **Step 3: Add the dialog component and wire `Change password` / `Log out` into `SidebarFooter`**
- [ ] **Step 4: Re-run the targeted test**

### Task 4: Verify the integrated flow

**Files:**
- Modify: `components/botchat/change-password-dialog.tsx`
- Modify: `components/botchat/sessions-panel.tsx`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run `bun run lint`**
- [ ] **Step 3: Run `bun run build`**
