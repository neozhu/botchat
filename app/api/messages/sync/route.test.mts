import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as chatContext from "../../../../lib/botchat/chat-context.ts";
import * as sessionTitle from "../../../../lib/botchat/session-title.ts";

test("message sync summarizes every first user title with the configured summary model", () => {
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
  assert.match(
    routeSource,
    /import\s+\{\s*getConversationSummaryModelId\s*\}\s+from\s+"@\/lib\/ai\/openai"/
  );
  assert.match(routeSource, /model:\s*openai\(getConversationSummaryModelId\(\)\)/);
  assert.match(routeSource, /reasoningEffort:\s*"none"/);
  assert.match(routeSource, /session:\s*{\s*id:\s*sessionId,\s*\.\.\.update\s*}/);
});

test("message sync persists independent summary batches after message upsert", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.match(
    routeSource,
    /\.from\("chat_messages"\)[\s\S]*\.is\("summarized_at", null\)/
  );
  assert.match(
    routeSource,
    /persistConversationSummaryBatches\(\{[\s\S]*messages:\s*unsummarizedRows/
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

type SummaryRow = { id: string; ui_message_id: string; role: string; parts: unknown[]; session_id: string };

function summaryRows(count: number, sessionId = "session-1"): SummaryRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sessionId}-m${index + 1}`, ui_message_id: `ui-${index + 1}`, session_id: sessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text: `message-${index + 1}` }],
  }));
}

function loadSummaryRoute(rows: SummaryRow[], generate: (request: { prompt: string }) => Promise<{ text: string }>) {
  const marked = new Set<string>();
  const writes: string[][] = [];
  const database = {
    from(table: string) {
      assert.equal(table, "chat_messages");
      let sessionId = "";
      const query = {
        select(columns: string) { assert.equal(columns, "id, ui_message_id, role, parts"); return query; },
        eq(column: string, value: string) { assert.equal(column, "session_id"); sessionId = value; return query; },
        is(column: string, value: unknown) { assert.equal(column, "summarized_at"); assert.equal(value, null); return query; },
        order(column: string) {
          assert.equal(column, "position");
          return Promise.resolve({ data: rows.filter((row) => row.session_id === sessionId && !marked.has(row.id)), error: null });
        },
      };
      return query;
    },
    async rpc(name: string, params: { p_message_row_ids: string[] }) {
      assert.equal(name, "persist_chat_context_summary");
      writes.push([...params.p_message_row_ids]);
      params.p_message_row_ids.forEach((id) => marked.add(id));
      return { error: null };
    },
  };
  function load(relative: string, expose = "") {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source + expose, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const routeModule = { exports: {} as Record<string, (database: unknown, sessionId: string) => Promise<void>> };
    runInNewContext(compiled, {
      exports: routeModule.exports, console,
      require(id: string): unknown {
        if (id === "ai") return { generateText: generate };
        if (id === "@ai-sdk/openai") return { openai: () => ({}) };
        if (id === "@/lib/ai/openai") return { getConversationSummaryModelId: () => "summary-test" };
        if (id === "@/lib/botchat/chat-context") return chatContext;
        if (id === "@/lib/botchat/session-title") return sessionTitle;
        if (id === "@/lib/supabase/server") return { createSupabaseServerClient: () => database };
        if (id === "@/lib/botchat/rolling-summary") return load("../../../../lib/botchat/rolling-summary.ts");
        throw new Error(`Unexpected route dependency: ${id}`);
      },
    });
    return routeModule.exports;
  }
  const route = load("./route.ts", "\nexports.summarize = persistConversationSummaryIfNeeded;");
  return { writes, summarize: (sessionId = "session-1") => route.summarize(database, sessionId) };
}

async function withSixMessageBatches(run: () => Promise<void>) {
  const previous = process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
  process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = "6";
  try { await run(); } finally {
    if (previous === undefined) delete process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
    else process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = previous;
  }
}

test("overlapping sync requests generate a completed batch only once", () => withSixMessageBatches(async () => {
  let generations = 0;
  let release!: () => void;
  const pause = new Promise<void>((resolve) => { release = resolve; });
  const route = loadSummaryRoute(summaryRows(6), async () => {
    generations += 1;
    await pause;
    return { text: "Batch summary" };
  });
  const pending = [route.summarize(), route.summarize(), route.summarize()];
  await new Promise<void>((resolve) => setImmediate(resolve));
  release();
  await Promise.all(pending);
  assert.equal(generations, 1);
  assert.equal(route.writes.length, 1);
}));

test("a queued sync re-reads unsummarized rows and picks up the next full batch", () => withSixMessageBatches(async () => {
  const rows = summaryRows(6);
  const prompts: string[] = [];
  let release!: () => void;
  const pause = new Promise<void>((resolve) => { release = resolve; });
  const route = loadSummaryRoute(rows, async ({ prompt }) => {
    prompts.push(prompt);
    if (prompts.length === 1) await pause;
    return { text: "Batch summary" };
  });
  const first = route.summarize();
  await new Promise<void>((resolve) => setImmediate(resolve));
  rows.push(...summaryRows(12).slice(6));
  const second = route.summarize();
  release();
  await Promise.all([first, second]);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /message-7/);
  assert.doesNotMatch(prompts[1], /message-1(?:\s|$)/);
  assert.deepEqual(route.writes, [
    ["session-1-m1", "session-1-m2", "session-1-m3", "session-1-m4", "session-1-m5", "session-1-m6"],
    ["session-1-m7", "session-1-m8", "session-1-m9", "session-1-m10", "session-1-m11", "session-1-m12"],
  ]);
}));

test("failed summary generation releases the session queue for a later retry", () => withSixMessageBatches(async () => {
  let generations = 0;
  const route = loadSummaryRoute(summaryRows(6), async () => {
    if (++generations === 1) throw new Error("Model unavailable");
    return { text: "Batch summary" };
  });
  await assert.rejects(route.summarize(), /Model unavailable/);
  await route.summarize();
  assert.equal(generations, 2);
  assert.equal(route.writes.length, 1);
}));

test("summary queues for different sessions run independently", () => withSixMessageBatches(async () => {
  let generations = 0;
  let release!: () => void;
  const pause = new Promise<void>((resolve) => { release = resolve; });
  const route = loadSummaryRoute([...summaryRows(6), ...summaryRows(6, "session-2")], async () => {
    generations += 1;
    await pause;
    return { text: "Batch summary" };
  });
  const pending = [route.summarize(), route.summarize("session-2")];
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(generations, 2);
  release();
  await Promise.all(pending);
}));
