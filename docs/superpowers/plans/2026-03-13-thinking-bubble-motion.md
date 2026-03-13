# Thinking Bubble Motion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated animated thinking bubble that appears while the assistant is streaming a reply.

**Architecture:** Keep the behavior local to the chat panel and split the animation timing into a small helper under `lib/botchat` so the motion configuration can be locked by a narrow `node:test` case. Replace the temporary `MessageBubble` placeholder with a dedicated `ThinkingBubble` component that reuses the existing assistant bubble styling and adds `motion/react` entrance and breathing animation only on the bubble body.

**Tech Stack:** Next.js 16, React 19, TypeScript, motion/react, node:test, Bun

---

## Chunk 1: Motion Config Test

### Task 1: Lock the animation contract in a focused test

**Files:**
- Create: `lib/botchat/thinking-bubble.test.mts`
- Create: `lib/botchat/thinking-bubble.ts`

- [ ] **Step 1: Write the failing test for the thinking bubble motion config**
- [ ] **Step 2: Run `bun test lib/botchat/thinking-bubble.test.mts` and verify it fails**
- [ ] **Step 3: Implement the helper that returns the expected motion states**
- [ ] **Step 4: Run `bun test lib/botchat/thinking-bubble.test.mts` and verify it passes**

## Chunk 2: Chat Panel Integration

### Task 2: Render a dedicated animated thinking bubble

**Files:**
- Modify: `components/botchat/chat-panel.tsx`
- Modify: `lib/botchat/thinking-bubble.ts`

- [ ] **Step 1: Import `motion/react` and the thinking bubble helper into the chat panel**
- [ ] **Step 2: Add a local `ThinkingBubble` component that keeps the avatar static and animates only the assistant bubble body**
- [ ] **Step 3: Replace the temporary `MessageBubble` placeholder under `shouldShowThinking` with the new component**
- [ ] **Step 4: Remove no-longer-needed placeholder handling from the generic message bubble**

## Chunk 3: Verification

### Task 3: Validate the change end to end

**Files:**
- Verify: `lib/botchat/thinking-bubble.test.mts`
- Verify: `components/botchat/chat-panel.tsx`

- [ ] **Step 1: Run `bun test lib/botchat/thinking-bubble.test.mts`**
- [ ] **Step 2: Run `bun run build`**
