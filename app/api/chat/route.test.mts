import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("conversation summary uses the fast mini model with reasoning disabled", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /const\s+CONVERSATION_SUMMARY_MODEL_ID\s*=\s*"gpt-5\.4-mini"/
  );
  assert.match(
    routeSource,
    /model:\s*openai\(CONVERSATION_SUMMARY_MODEL_ID\)/
  );
  assert.match(
    routeSource,
    /summarizeMessages:[\s\S]*reasoningEffort:\s*"none"/
  );
});
