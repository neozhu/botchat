import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("rolling summary helper owns generation, session update, and message marking", () => {
  const helperSource = readFileSync(
    fileURLToPath(new URL("./rolling-summary.ts", import.meta.url)),
    "utf8"
  );

  assert.match(helperSource, /buildRollingConversationSummaryPrompt/);
  assert.match(helperSource, /selectMessagesForPersistentSummary/);
  assert.match(helperSource, /persist_chat_context_summary/);
  assert.match(helperSource, /p_context_summary:\s*summary/);
  assert.match(helperSource, /p_message_row_ids/);
  assert.match(helperSource, /p_ui_message_ids/);
});

test("chat and message sync routes use the shared rolling summary helper", () => {
  const chatRouteSource = readFileSync(
    fileURLToPath(new URL("../../app/api/chat/route.ts", import.meta.url)),
    "utf8"
  );
  const syncRouteSource = readFileSync(
    fileURLToPath(new URL("../../app/api/messages/sync/route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(chatRouteSource, /persistRollingConversationSummary\(/);
  assert.match(syncRouteSource, /persistRollingConversationSummary\(/);
  assert.doesNotMatch(
    chatRouteSource,
    /async function persistRequestRollingConversationSummaryIfNeeded/
  );
  assert.doesNotMatch(
    syncRouteSource,
    /async function buildPersistentConversationSummary/
  );
});

test("schema defines transactional rolling summary persistence rpc", () => {
  const schemaSource = readFileSync(
    fileURLToPath(new URL("../../supabase/schema.sql", import.meta.url)),
    "utf8"
  );

  assert.match(schemaSource, /create or replace function public\.persist_chat_context_summary/);
  assert.match(schemaSource, /update public\.chat_sessions/);
  assert.match(schemaSource, /update public\.chat_messages/);
});
