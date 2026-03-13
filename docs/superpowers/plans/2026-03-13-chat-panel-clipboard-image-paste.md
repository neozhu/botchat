# Chat Panel Clipboard Image Paste Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users paste screenshot images into the chat composer so they enter the existing attachment preview area and send through the current upload flow only when `Send` is pressed.

**Architecture:** Add a small clipboard helper under `lib/botchat` to normalize pasted image files and decide when paste should suppress default browser insertion. Wire `components/botchat/chat-panel.tsx` to use that helper on textarea paste while preserving the current `dashboard` upload/send behavior.

**Tech Stack:** React 19, Next.js 16, TypeScript, Bun test, existing botchat attachment flow.

---

## Chunk 1: Clipboard Helper

### Task 1: Add failing tests for clipboard image normalization

**Files:**
- Create: `lib/botchat/chat-clipboard.test.mts`
- Create: `lib/botchat/chat-clipboard.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `bun test lib/botchat/chat-clipboard.test.mts` and confirm failure**
- [ ] **Step 3: Implement filename generation, per-paste uniqueness, and image-only default suppression logic in `lib/botchat/chat-clipboard.ts`**
- [ ] **Step 4: Re-run `bun test lib/botchat/chat-clipboard.test.mts` and confirm pass**

## Chunk 2: Chat Panel Integration

### Task 2: Wire textarea paste handling into composer attachments

**Files:**
- Modify: `components/botchat/chat-panel.tsx`
- Reuse: `lib/botchat/chat-clipboard.ts`

- [ ] **Step 1: Add textarea paste handler that respects `canSend`**
- [ ] **Step 2: Extract pasted image items, normalize to `File`s, append to `pendingFiles`, and keep mixed text paste native**
- [ ] **Step 3: Prevent default only for image-only paste**

## Chunk 3: Verification

### Task 3: Verify implementation

**Files:**
- Test: `lib/botchat/chat-clipboard.test.mts`
- Build: whole app

- [ ] **Step 1: Run `bun test lib/botchat/chat-clipboard.test.mts`**
- [ ] **Step 2: Run `bun run build`**
- [ ] **Step 3: Manually verify screenshot paste, text-only paste, and mixed paste in the browser**
