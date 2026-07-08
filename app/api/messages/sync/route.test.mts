import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("message sync summarizes every first user title with the fast mini model", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(routeSource, /isSessionTitleTooLong\(titleSource\)/);
  assert.match(routeSource, /shouldGenerateSessionTitle\(/);
  assert.match(routeSource, /\.from\("chat_messages"\)[\s\S]*?\.eq\("role", "user"\)/);
  assert.match(routeSource, /last\?\.role\s*===\s*"assistant"/);
  assert.doesNotMatch(
    routeSource,
    /const\s+lastText\s*=\s*last\s*\?\s*messageText\(last\)/
  );
  assert.match(routeSource, /model:\s*openai\(SESSION_TITLE_MODEL_ID\)/);
  assert.match(routeSource, /reasoningEffort:\s*"none"/);
  assert.match(routeSource, /session:\s*{\s*id:\s*sessionId,\s*\.\.\.update\s*}/);
});

test("message sync persists rolling conversation summaries after message upsert", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /\.select\("id, context_summary"\)[\s\S]*\.from\("chat_messages"\)[\s\S]*\.is\("summarized_at", null\)/
  );
  assert.match(
    routeSource,
    /persistRollingConversationSummary\(\{[\s\S]*messages:\s*unsummarizedRows[\s\S]*markerColumn:\s*"id"/
  );
  assert.match(
    routeSource,
    /getMarkerKey:\s*\(row\)\s*=>\s*row\.id/
  );
  assert.doesNotMatch(routeSource, /if\s*\(\s*!summary\s*\)\s*return\s+null/);
});

test("message sync persists message token usage and refreshes the session token total", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(routeSource, /function\s+messageTotalTokens\(/);
  assert.match(routeSource, /total_tokens:\s*messageTotalTokens\(m\)/);
  assert.match(routeSource, /\.select\("total_tokens"\)[\s\S]*\.eq\("session_id", sessionId\)/);
  assert.match(routeSource, /update\.total_tokens\s*=\s*sessionTotalTokens/);
});


test("message sync stores and summarizes messages by explicit position", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(routeSource, /type\s+PersistableUIMessage\s*=\s*UIMessage & \{ position\?: number \}/);
  assert.match(routeSource, /position:\s*m\.position \?\? index/);
  assert.match(routeSource, /\.order\("position", \{ ascending: true \}\)/);
  assert.doesNotMatch(routeSource, /nullsFirst/);
});
