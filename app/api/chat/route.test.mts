import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("conversation summary uses the configured summary model helper with minimal reasoning", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(routeSource, /CONVERSATION_SUMMARY_MODEL_ID/);
  assert.match(
    routeSource,
    /import\s+\{\s*getConversationSummaryModelId,\s*getOpenAIModelId,?\s*\}\s+from\s+"@\/lib\/ai\/openai"/
  );
  assert.match(
    routeSource,
    /model:\s*openai\(getConversationSummaryModelId\(\)\)/
  );
  assert.match(
    routeSource,
    /summarizeMessages:[\s\S]*reasoningEffort:\s*"minimal"/
  );
});
