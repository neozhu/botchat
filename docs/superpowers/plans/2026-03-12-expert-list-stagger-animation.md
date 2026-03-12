# Expert List Stagger Animation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-load staggered entrance animation for expert rows in the Expert Settings dialog without replaying during search or reorder.

**Architecture:** Keep the animation local to `ExpertSettingsDialog` and use a small helper layer in `lib/botchat/expert-settings.ts` for deterministic selection and animation timing logic. Use CSS keyframes in global styles so the list rows can animate without adding a runtime animation dependency.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, node:test, Bun

---

## Chunk 1: Helpers And Tests

### Task 1: Lock the behavior in tests

**Files:**
- Modify: `lib/botchat/expert-settings.test.mts`
- Modify: `lib/botchat/expert-settings.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `bun test lib/botchat/expert-settings.test.mts` to verify the new cases fail**
- [ ] **Step 3: Implement helper support for preserving intentional empty selection and row intro delay**
- [ ] **Step 4: Run `bun test lib/botchat/expert-settings.test.mts` to verify it passes**

## Chunk 2: Dialog Animation

### Task 2: Animate the expert list on first successful load

**Files:**
- Modify: `components/botchat/expert-settings-dialog.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add a local intro-animation state that only activates on the first successful list load after the dialog opens**
- [ ] **Step 2: Preserve explicit `New expert` mode so late list responses do not overwrite the blank draft**
- [ ] **Step 3: Apply staggered row animation classes/styles to the list items**
- [ ] **Step 4: Add reduced-motion-safe CSS keyframes and utility class**

## Chunk 3: Verification

### Task 3: Verify the change

**Files:**
- Verify: `lib/botchat/expert-settings.test.mts`
- Verify: `components/botchat/expert-settings-dialog.tsx`

- [ ] **Step 1: Run `bun test lib/botchat/expert-settings.test.mts`**
- [ ] **Step 2: Run `bun lint`**
- [ ] **Step 3: Run `bun run build`**
