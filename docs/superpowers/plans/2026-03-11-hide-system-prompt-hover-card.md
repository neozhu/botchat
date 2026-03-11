# Hide System Prompt Hover Card Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `system_prompt` from the active expert hover card while keeping the hover affordance and expert description intact.

**Architecture:** Extract the hover card display data into a tiny helper so the visibility rule can be tested in isolation. Update `chat-panel.tsx` to render only the helper output and stop reading `system_prompt` for the hover surface.

**Tech Stack:** Next.js 16, React 19, TypeScript, node:test

---

### Task 1: Lock hover-card display rules with tests

**Files:**
- Create: `lib/botchat/active-expert-card.ts`
- Create: `lib/botchat/active-expert-card.test.mts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test and verify it fails**
- [ ] **Step 3: Write the minimal helper**
- [ ] **Step 4: Re-run the test and verify it passes**

### Task 2: Apply the helper to the chat panel

**Files:**
- Modify: `components/botchat/chat-panel.tsx`
- Test: `lib/botchat/active-expert-card.test.mts`

- [ ] **Step 1: Import the helper into `chat-panel.tsx`**
- [ ] **Step 2: Remove the `system_prompt` block from the hover card**
- [ ] **Step 3: Render only the public description text when present**
- [ ] **Step 4: Run targeted test, `bun run lint`, and `bun run build`**
