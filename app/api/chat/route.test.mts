import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as ai from "ai";
import * as contextHelpers from "../../../lib/botchat/chat-context.ts";
import * as reasoningHelpers from "../../../lib/ai/reasoning-effort.ts";

test("batch conversation summary uses the configured summary model helper with none reasoning", () => {
  const helperSource = readFileSync(
    fileURLToPath(new URL("../../../lib/botchat/rolling-summary.ts", import.meta.url)),
    "utf8"
  );
  assert.match(helperSource, /model:\s*openai\(getConversationSummaryModelId\(\)\)/);
  assert.match(helperSource, /reasoningEffort:\s*"none"/);
});

type StreamRequest = { messages: ai.ModelMessage[] };

function modelMessageText(message: ai.ModelMessage) {
  return typeof message.content === "string" ? message.content : message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text).join("");
}

function loadChatRoute() {
  const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requests: StreamRequest[] = [];
  let relevanceCalls = 0;
  const routeModule = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  runInNewContext(compiled, {
    exports: routeModule.exports,
    Response,
    require: (id: string) => {
      if (id === "ai") return {
        ...ai,
        streamText: (request: StreamRequest) => { requests.push(request); return { stream: {} }; },
        toUIMessageStream: () => ({}),
        createUIMessageStreamResponse: () => new Response("stream"),
      };
      if (id === "@ai-sdk/openai") return { openai: () => ({}) };
      if (id === "zod") return { z: { object: () => ({}) } };
      if (id === "@/lib/ai/reasoning-effort") return reasoningHelpers;
      if (id === "@/lib/supabase/server") return { createSupabaseServerClient: async () => ({}) };
      if (id === "@/lib/ai/openai") return { getOpenAIModelId: () => "test-model" };
      if (id === "@/lib/botchat/chat-context") return contextHelpers;
      if (id === "@/lib/ai/typesafe") return { evaluateChatHistoryNeed: async () => { relevanceCalls += 1; throw new Error("Jev must not be called"); } };
      if (id === "@/lib/botchat/skills") return { loadChatSkillsForPrompt: async () => [], appendChatSkillInstructions: (system: string) => system };
      throw new Error(`Unexpected route dependency: ${id}`);
    },
  });
  return { post: routeModule.exports.POST, requests, relevanceCalls: () => relevanceCalls };
}

function chatRequest(text = "Hello") {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: Array.from({ length: 9 }, (_, index) => ({
      id: `m${index + 1}`, role: index % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `${index + 1}: ${text}` }],
    })) }),
    headers: { "Content-Type": "application/json" },
  });
}

test("chat route streams the latest configured messages without calling relevance evaluation", async () => {
  const route = loadChatRoute();
  const response = await route.post(chatRequest());
  assert.equal(response.status, 200);
  assert.equal(route.relevanceCalls(), 0);
  assert.equal(route.requests.length, 1);
  assert.deepEqual(route.requests[0].messages.map(modelMessageText), [
    "4: Hello", "5: Hello", "6: Hello", "7: Hello", "8: Hello", "9: Hello",
  ]);
});

test("chat route streams only messages that fit the token budget", async () => {
  const route = loadChatRoute();
  const response = await route.post(chatRequest("a ".repeat(4500)));
  assert.equal(response.status, 200);
  assert.equal(route.requests[0].messages.length, 4);
  assert.equal(modelMessageText(route.requests[0].messages[0]), `6: ${"a ".repeat(4500)}`);
});

test("chat route rejects an oversized current message before invoking the model", async () => {
  const route = loadChatRoute();
  const response = await route.post(chatRequest("a ".repeat(20_000)));
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /shorten.*message/i);
  assert.equal(route.requests.length, 0);
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
