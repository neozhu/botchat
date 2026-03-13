# Expert List DnD Kit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native expert-list drag logic with `@dnd-kit/sortable` while keeping handle-only drag and drop-time-only reorder.

**Architecture:** Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`, keep the existing list UI inside `ExpertSettingsDialog`, and extract a tiny reorder helper in `lib/botchat` so no-op drops and normalized drop results are covered by focused tests. Use `DragOverlay` so the source list stays static until drop.

**Tech Stack:** Next.js 16, React 19, TypeScript, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, node:test, Bun

---

## Chunk 1: Reorder Helper And Tests

### Task 1: Lock drop-time reorder behavior in tests

**Files:**
- Create: `lib/botchat/expert-list-sortable.ts`
- Create: `lib/botchat/expert-list-sortable.test.mts`

- [ ] **Step 1: Write the failing test for no-op drops, normalized reorder output, and selected expert sort-order sync input**
- [ ] **Step 2: Run `bun test lib/botchat/expert-list-sortable.test.mts` and verify it fails for the missing helper**
- [ ] **Step 3: Implement the minimal reorder helper**
- [ ] **Step 4: Run `bun test lib/botchat/expert-list-sortable.test.mts` and verify it passes**

## Chunk 2: DnD Kit Integration

### Task 2: Replace native pointer drag with dnd-kit sortable rows

**Files:**
- Modify: `package.json`
- Modify: `components/botchat/expert-settings-dialog.tsx`
- Modify: `lib/botchat/expert-list-sortable.ts`

- [ ] **Step 1: Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` dependencies**
- [ ] **Step 2: Replace the native handle pointer handlers with `DndContext`, `SortableContext`, and `useSortable`**
- [ ] **Step 3: Bind drag listeners only to the grip handle and keep the expert content button clickable**
- [ ] **Step 4: Render a `DragOverlay` copy of the active row while keeping the source list order unchanged during drag**
- [ ] **Step 5: On drop, reorder once, normalize `sort_order`, sync selected draft order, and persist using the existing reorder API**
- [ ] **Step 6: Keep drag disabled under the existing loading/search/save/generate/delete/reorder constraints**

## Chunk 3: Verification

### Task 3: Verify the dnd-kit behavior

**Files:**
- Verify: `lib/botchat/expert-list-sortable.test.mts`
- Verify: `components/botchat/expert-settings-dialog.tsx`

- [ ] **Step 1: Run `bun test lib/botchat/expert-list-sortable.test.mts`**
- [ ] **Step 2: Run `bun run build`**
- [ ] **Step 3: Manually verify drag starts only from the handle**
- [ ] **Step 4: Manually verify the list does not reorder until drop**
- [ ] **Step 5: Manually verify dropping onto a new row reorders once and persists**
- [ ] **Step 6: Manually verify dropping onto the same row is a no-op**
