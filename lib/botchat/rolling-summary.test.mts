import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as chatContext from "./chat-context.ts";

test("batch summary helper owns generation, session update, and message marking", () => {
  const helperSource = readFileSync(
    fileURLToPath(new URL("./rolling-summary.ts", import.meta.url)),
    "utf8"
  );

  assert.match(helperSource, /buildConversationSummaryPrompt/);
  assert.match(helperSource, /selectMessagesForPersistentSummary/);
  assert.match(helperSource, /persist_chat_context_summary/);
  assert.match(helperSource, /p_context_summary:\s*summary/);
  assert.match(helperSource, /p_message_row_ids/);
  assert.match(helperSource, /p_ui_message_ids/);
});

test("message sync owns summary persistence while chat only selects relevant messages", () => {
  const chatRouteSource = readFileSync(
    fileURLToPath(new URL("../../app/api/chat/route.ts", import.meta.url)),
    "utf8"
  );
  const syncRouteSource = readFileSync(
    fileURLToPath(new URL("../../app/api/messages/sync/route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(chatRouteSource, /prepareRelevantChatModelContext\(/);
  assert.doesNotMatch(chatRouteSource, /persistConversationSummaryBatches\(/);
  assert.match(syncRouteSource, /persistConversationSummaryBatches\(/);
  assert.doesNotMatch(
    syncRouteSource,
    /async function buildPersistentConversationSummary/
  );
});

test("schema defines transactional summary persistence rpc", () => {
  const schemaSource = readFileSync(
    fileURLToPath(new URL("../../supabase/schema.sql", import.meta.url)),
    "utf8"
  );

  assert.match(schemaSource, /create or replace function public\.persist_chat_context_summary/);
  assert.match(schemaSource, /update public\.chat_sessions/);
  assert.match(schemaSource, /update public\.chat_messages/);
});

type SummaryRequest = { prompt: string };
type SummaryWrite = {
  p_context_summary: string;
  p_message_row_ids: string[] | null;
  p_ui_message_ids: string[] | null;
};

function loadSummaryHelper(generate: (request: SummaryRequest) => Promise<{ text: string }>) {
  const source = readFileSync(fileURLToPath(new URL("./rolling-summary.ts", import.meta.url)), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const summaryModule = { exports: {} as Record<string, (options: Record<string, unknown>) => Promise<unknown>> };
  runInNewContext(compiled, {
    exports: summaryModule.exports,
    require: (id: string) => {
      if (id === "ai") return { generateText: generate };
      if (id === "@ai-sdk/openai") return { openai: () => ({}) };
      if (id === "@/lib/ai/openai") return { getConversationSummaryModelId: () => "summary-test" };
      if (id === "@/lib/botchat/chat-context") return chatContext;
      throw new Error(`Unexpected summary dependency: ${id}`);
    },
  });
  return summaryModule.exports.persistConversationSummaryBatches;
}

function batchMessages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index + 1}`,
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
    parts: [{ type: "text" as const, text: `message-${index + 1}-content` }],
    total_tokens: 10_000,
  }));
}

async function withBatchSize(run: () => Promise<void>) {
  const previous = process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
  process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = "6";
  try { await run(); } finally {
    if (previous === undefined) delete process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
    else process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = previous;
  }
}

test("summary persistence waits for a full batch even when token usage is high", () => withBatchSize(async () => {
  let generations = 0;
  const writes: SummaryWrite[] = [];
  const persist = loadSummaryHelper(async () => { generations += 1; return { text: "Summary" }; });
  await persist({
    supabase: { rpc: async (_name: string, params: SummaryWrite) => { writes.push(structuredClone(params)); return { error: null }; } },
    sessionId: "session-1", previousSummary: "Old saved summary", messages: batchMessages(5),
    markerColumn: "id", getMarkerKey: (message: { id: string }) => message.id, toUiMessage: (message: unknown) => message,
  });
  assert.equal(generations, 0);
  assert.deepEqual(writes, []);
}));

test("summary persistence summarizes and marks all six messages without the previous summary", () => withBatchSize(async () => {
  const prompts: string[] = [];
  const writes: SummaryWrite[] = [];
  const persist = loadSummaryHelper(async ({ prompt }) => { prompts.push(prompt); return { text: "  Batch summary  " }; });
  await persist({
    supabase: { rpc: async (_name: string, params: SummaryWrite) => { writes.push(structuredClone(params)); return { error: null }; } },
    sessionId: "session-1", previousSummary: "Old saved summary", messages: batchMessages(6),
    markerColumn: "id", getMarkerKey: (message: { id: string }) => message.id, toUiMessage: (message: unknown) => message,
  });
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /message-6-content/);
  assert.doesNotMatch(prompts[0], /Old saved summary/);
  assert.equal(writes[0].p_context_summary, "Batch summary");
  assert.deepEqual(writes[0].p_message_row_ids, ["m1", "m2", "m3", "m4", "m5", "m6"]);
}));

test("summary persistence handles two independent full batches and leaves the remainder", () => withBatchSize(async () => {
  const prompts: string[] = [];
  const writes: SummaryWrite[] = [];
  const persist = loadSummaryHelper(async ({ prompt }) => { prompts.push(prompt); return { text: `batch-summary-${prompts.length}` }; });
  await persist({
    supabase: { rpc: async (_name: string, params: SummaryWrite) => { writes.push(structuredClone(params)); return { error: null }; } },
    sessionId: "session-1", previousSummary: "Old saved summary", messages: batchMessages(13),
    markerColumn: "id", getMarkerKey: (message: { id: string }) => message.id, toUiMessage: (message: unknown) => message,
  });
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /message-6-content/);
  assert.doesNotMatch(prompts[0], /message-7-content/);
  assert.match(prompts[1], /message-7-content/);
  assert.match(prompts[1], /message-12-content/);
  assert.doesNotMatch(prompts[1], /message-13-content|batch-summary-1|Old saved summary/);
  assert.deepEqual(writes.map((write) => write.p_message_row_ids), [
    ["m1", "m2", "m3", "m4", "m5", "m6"], ["m7", "m8", "m9", "m10", "m11", "m12"],
  ]);
}));

test("summary persistence rejects an empty model result without marking the batch", () => withBatchSize(async () => {
  const writes: SummaryWrite[] = [];
  const persist = loadSummaryHelper(async () => ({ text: "   " }));
  await assert.rejects(persist({
    supabase: { rpc: async (_name: string, params: SummaryWrite) => { writes.push(structuredClone(params)); return { error: null }; } },
    sessionId: "session-1", previousSummary: null, messages: batchMessages(6),
    markerColumn: "id", getMarkerKey: (message: { id: string }) => message.id, toUiMessage: (message: unknown) => message,
  }), /empty.*summary/i);
  assert.deepEqual(writes, []);
}));

test("summary persistence leaves the batch unmarked when generation fails", () => withBatchSize(async () => {
  const writes: SummaryWrite[] = [];
  const persist = loadSummaryHelper(async () => { throw new Error("Summary model unavailable"); });
  await assert.rejects(persist({
    supabase: { rpc: async (_name: string, params: SummaryWrite) => { writes.push(structuredClone(params)); return { error: null }; } },
    sessionId: "session-1", messages: batchMessages(6), toUiMessage: (message: unknown) => message,
  }), /Summary model unavailable/);
  assert.deepEqual(writes, []);
}));

test("summary persistence stops on a failed save and retries the same batch on the next call", () => withBatchSize(async () => {
  const prompts: string[] = [];
  const writes: SummaryWrite[] = [];
  let failSave = true;
  const persist = loadSummaryHelper(async ({ prompt }) => { prompts.push(prompt); return { text: "Batch summary" }; });
  const options = {
    supabase: { rpc: async (_name: string, params: SummaryWrite) => {
      writes.push(structuredClone(params));
      return { error: failSave ? { message: "Save failed" } : null };
    } },
    sessionId: "session-1", messages: batchMessages(12), toUiMessage: (message: unknown) => message,
  };
  await assert.rejects(persist(options), /Save failed/);
  assert.equal(prompts.length, 1);
  failSave = false;
  await persist(options);
  assert.deepEqual(writes.map((write) => write.p_message_row_ids), [
    ["m1", "m2", "m3", "m4", "m5", "m6"],
    ["m1", "m2", "m3", "m4", "m5", "m6"],
    ["m7", "m8", "m9", "m10", "m11", "m12"],
  ]);
}));
