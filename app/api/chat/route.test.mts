import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("batch conversation summary uses the configured summary model helper with none reasoning", () => {
  const helperSource = readFileSync(
    fileURLToPath(new URL("../../../lib/botchat/rolling-summary.ts", import.meta.url)),
    "utf8"
  );
  assert.match(helperSource, /model:\s*openai\(getConversationSummaryModelId\(\)\)/);
  assert.match(helperSource, /reasoningEffort:\s*"none"/);
});

test("chat route routes original messages using Jev and loads the expert configuration", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /prepareRelevantChatModelContext/
  );
  assert.match(
    routeSource,
    /"expert:experts\(system_prompt, model, reasoning_effort\)"/
  );
  assert.match(
    routeSource,
    /prepareRelevantChatModelContext\([\s\S]*messages as UIMessage\[\],[\s\S]*evaluateHistoryNeed:\s*evaluateChatHistoryNeed/
  );
});

test("chat route appends expert-requested skill instructions", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /import\s+\{[\s\S]*appendChatSkillInstructions,[\s\S]*loadChatSkillsForPrompt,[\s\S]*}\s+from\s+"@\/lib\/botchat\/skills"/
  );
  assert.match(
    routeSource,
    /appendChatSkillInstructions\(\s*system,\s*await loadChatSkillsForPrompt\(system\)\s*\)/
  );
});

test("chat route attaches final total token usage to assistant message metadata", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(routeSource, /toUIMessageStream\(\{/);
  assert.match(routeSource, /createUIMessageStreamResponse\(\{\s*stream\s*}\)/);
  assert.match(routeSource, /messageMetadata:\s*\(\{\s*part\s*}\)/);
  assert.match(routeSource, /part\.type\s*===\s*"finish"/);
  assert.match(routeSource, /totalTokens:\s*part\.totalUsage\.totalTokens/);
});
