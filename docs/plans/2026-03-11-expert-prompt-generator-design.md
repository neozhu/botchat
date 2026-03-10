# Expert Prompt Generator Design

**Goal:** Improve the expert-generation agent prompt so GPT-5 produces stronger, more reliable `system_prompt` and `suggestion_question` outputs.

**Context:** `app/api/experts/generate/route.ts` currently sends a short natural-language prompt to `generateText`. The route works, but the prompt is underspecified for GPT-5-class models and does not clearly encode output quality criteria beyond a few basic bullets.

**Design:**

1. Extract prompt construction into a focused helper so prompt behavior is testable without invoking the model.
2. Rework the generator prompt to reflect GPT-5 prompting guidance:
   - state the exact task and output contract up front
   - make the generated system prompt self-contained and directly usable
   - specify scope boundaries, uncertainty handling, and failure behavior explicitly
   - require concise, concrete instructions instead of generic prose
   - prevent scope creep, invented details, and contradictory instructions
   - add a lightweight self-check before returning
3. Keep the route API and structured output schema unchanged.

**Files:**
- Create `app/api/experts/generate/prompt.ts` for the pure prompt builder
- Modify `app/api/experts/generate/route.ts` to consume the helper
- Create `app/api/experts/generate/prompt.test.mts` for Node-native regression coverage

**Verification:**
- Run a focused Node test that validates the generated meta-prompt contains the expected GPT-5-oriented guidance and input interpolation.
- Run lint to catch integration issues.
