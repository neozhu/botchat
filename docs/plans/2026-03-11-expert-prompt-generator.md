# Expert Prompt Generator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the expert prompt-generation route so GPT-5 receives a clearer, higher-signal meta-prompt and returns better expert prompts without changing the API contract.

**Architecture:** Split prompt construction into a pure helper in the same route folder, then make the route call that helper before invoking `generateText`. Cover the helper with a Node-native test so the guidance encoded in the prompt is regression-tested without depending on live model calls.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Node test runner, Vercel AI SDK, Zod.

---

### Task 1: Add a failing regression test for the prompt builder

**Files:**
- Create: `app/api/experts/generate/prompt.test.mts`
- Test: `app/api/experts/generate/prompt.test.mts`

- [ ] **Step 1: Write the failing test**

Create a test that imports `buildExpertGenerationPrompt` and asserts the returned prompt includes:
- an explicit output contract for `system_prompt` and `suggestion_question`
- GPT-5-style guidance about being specific, self-contained, and avoiding invented details
- the provided input values (`name`, `agentName`, `description`, `languageHint`)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test app/api/experts/generate/prompt.test.mts`
Expected: FAIL because `prompt.ts` does not exist yet

### Task 2: Implement the pure prompt builder

**Files:**
- Create: `app/api/experts/generate/prompt.ts`
- Modify: `app/api/experts/generate/route.ts`
- Test: `app/api/experts/generate/prompt.test.mts`

- [ ] **Step 1: Write the minimal implementation**

Add `buildExpertGenerationPrompt(input)` that:
- keeps the current input fields
- rewrites the prompt using stronger GPT-5-oriented instructions
- remains deterministic and string-based

- [ ] **Step 2: Wire the route to use the helper**

Replace the inline prompt array in `route.ts` with a call to `buildExpertGenerationPrompt(...)`.

- [ ] **Step 3: Run test to verify it passes**

Run: `node --experimental-strip-types --test app/api/experts/generate/prompt.test.mts`
Expected: PASS

### Task 3: Verify integration

**Files:**
- Modify: `app/api/experts/generate/route.ts`

- [ ] **Step 1: Run lint**

Run: `npm run lint -- app/api/experts/generate/route.ts app/api/experts/generate/prompt.ts`
Expected: no new lint errors from this change
