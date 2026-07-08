import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("conversation summary uses the configured summary model helper with none reasoning", () => {
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
    /summarizeMessages:[\s\S]*reasoningEffort:\s*"none"/
  );
});

test("chat route uses persisted session summary state before runtime compaction", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /appendSavedConversationSummaryContext[\s\S]*filterSummarizedMessages/
  );
  assert.match(
    routeSource,
    /\.select\("expert:experts\(system_prompt\), context_summary"\)/
  );
  assert.match(
    routeSource,
    /\.select\("ui_message_id"\)[\s\S]*\.not\("summarized_at", "is", null\)/
  );
  assert.match(
    routeSource,
    /filterSummarizedMessages\([\s\S]*messages as UIMessage\[\],[\s\S]*summarizedUiMessageIds[\s\S]*\)/
  );
  assert.match(
    routeSource,
    /appendSavedConversationSummaryContext\(system, contextSummary\)/
  );
});

test("chat route persists a rolling request summary before runtime compaction", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /persistRollingConversationSummary\(\{[\s\S]*messages:\s*contextMessages[\s\S]*markerColumn:\s*"ui_message_id"/
  );
  assert.match(routeSource, /getMarkerKey:\s*\(message\)\s*=>\s*message\.id/);
  assert.match(routeSource, /summarizedMessageKeys/);
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
