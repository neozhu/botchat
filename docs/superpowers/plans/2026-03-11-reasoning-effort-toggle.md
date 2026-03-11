# Reasoning Effort Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default chat requests to `reasoningEffort = "low"` and add a brain toolbar toggle that switches outgoing chat requests to `high`.

**Architecture:** Extract reasoning-effort normalization into a tiny helper so both the dashboard request body and the API route use the same rules. Keep the UI change local to the existing toolbar by adding a single toggle button and passing the selected mode through the existing `/api/chat` request body.

**Tech Stack:** Next.js 16, React 19, Vercel AI SDK, OpenAI provider, TypeScript, node:test

---

### Task 1: Lock reasoning-effort rules with tests

**Files:**
- Create: `lib/ai/reasoning-effort.ts`
- Create: `lib/ai/reasoning-effort.test.mts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test and verify it fails**
- [ ] **Step 3: Write the minimal helper**
- [ ] **Step 4: Re-run the test and verify it passes**

### Task 2: Apply reasoning-effort to the chat route

**Files:**
- Modify: `app/api/chat/route.ts`
- Test: `lib/ai/reasoning-effort.test.mts`

- [ ] **Step 1: Read `reasoningEffort` from the request body**
- [ ] **Step 2: Normalize invalid or missing values to `low`**
- [ ] **Step 3: Pass the value to OpenAI provider options in `streamText`**
- [ ] **Step 4: Re-run the targeted test**

### Task 3: Add the toolbar brain toggle

**Files:**
- Modify: `components/botchat/dashboard.tsx`
- Modify: `components/botchat/chat-panel.tsx`

- [ ] **Step 1: Add local reasoning toggle state in the dashboard**
- [ ] **Step 2: Include the normalized value in every `/api/chat` send**
- [ ] **Step 3: Add a brain icon button that visually highlights only when active**
- [ ] **Step 4: Run targeted test, `bun run lint`, and `bun run build`**
