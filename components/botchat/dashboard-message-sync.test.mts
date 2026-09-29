import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Message = { id: string; role: string; parts: unknown[] };

function loadSyncEffect(response = new Response(JSON.stringify({ ok: true }), { status: 200 })) {
  const source = readFileSync(new URL("./dashboard.tsx", import.meta.url), "utf8");
  const file = ts.createSourceFile("dashboard.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === "useEffect" &&
      node.arguments[0]?.getText(file).includes('fetch("/api/messages/sync"')) {
      callback = node.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(callback, "Find the production message sync effect");
  const compiled = ts.transpileModule(`exports.run = ${callback.getText(file)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const timers = new Map<number, () => void>();
  const requests: { sessionId: string; summarize: boolean; messages: (Message & { position: number })[] }[] = [];
  const savedIds = new Set<string>();
  const savedFingerprints = new Map<string, string>();
  const effectModule = { exports: {} as { run: () => (() => void) | undefined } };
  let nextTimer = 0;
  const context = {
    exports: effectModule.exports,
    status: "ready",
    messages: [] as Message[],
    renderedMessagesSessionId: "session-1",
    savedMessageIdsRef: { current: savedIds },
    savedMessageFingerprintsRef: { current: savedFingerprints },
    messageFingerprint: (message: Message) => JSON.stringify({ role: message.role, parts: message.parts, metadata: null }),
    setTimeout: (run: () => void) => { timers.set(++nextTimer, run); return nextTimer; },
    clearTimeout: (id: number) => { timers.delete(id); },
    fetch: async (_url: string, options: { body: string }) => { requests.push(JSON.parse(options.body)); return response.clone(); },
    setSessions: () => {},
    console: { error: () => {} },
  };
  runInNewContext(compiled, context);
  return {
    requests, savedIds, savedFingerprints,
    render(messages: Message[], status: string) {
      context.messages = messages;
      context.status = status;
      return effectModule.exports.run();
    },
    async flush() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((run) => run());
      await new Promise<void>((resolve) => setImmediate(resolve));
    },
  };
}

const messages: Message[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "你知道我是谁吗" }] },
  { id: "a1", role: "assistant", parts: [{ type: "text", text: "还不知道" }] },
  { id: "u2", role: "user", parts: [{ type: "text", text: "我叫 hualin" }] },
  { id: "a2", role: "assistant", parts: [{ type: "text", text: "你好 hualin" }] },
  { id: "u3", role: "user", parts: [{ type: "text", text: "今天星期几" }] },
  { id: "a3", role: "assistant", parts: [{ type: "tool-getCurrentSystemDateTime", toolCallId: "time-1", state: "output-available", input: {}, output: { formattedDateTime: "Tuesday" } }] },
];

test("sync saves streamed messages but only requests a summary after the six-message batch completes", async () => {
  const sync = loadSyncEffect();
  sync.render(messages.slice(0, 5), "submitted");
  await sync.flush();
  sync.render(messages, "streaming");
  await sync.flush();
  sync.render(messages, "streaming");
  await sync.flush();
  assert.ok(sync.requests.length > 0);
  assert.equal(sync.requests.filter((request) => request.summarize).length, 0);
  const completed = [...messages.slice(0, 5), { ...messages[5], parts: [...messages[5].parts, { type: "text", text: "今天是星期二。", state: "done" }] }];
  sync.render(completed, "ready");
  await sync.flush();
  const finalRequests = sync.requests.filter((request) => request.summarize);
  assert.equal(finalRequests.length, 1);
  assert.deepEqual(finalRequests[0].messages.map((message) => message.position), [5]);
  assert.deepEqual(finalRequests[0].messages[0].parts.at(-1), { type: "text", text: "今天是星期二。", state: "done" });
  sync.render(completed, "ready");
  await sync.flush();
  assert.equal(sync.requests.filter((request) => request.summarize).length, 1);
});

test("a ready transition requests a final sync even when tool message parts are unchanged", async () => {
  const sync = loadSyncEffect();
  sync.render(messages, "streaming");
  await sync.flush();
  sync.render(messages, "ready");
  await sync.flush();
  assert.equal(sync.requests.length, 2);
  assert.equal(sync.requests[0].summarize, false);
  assert.equal(sync.requests[1].summarize, true);
  assert.deepEqual(sync.requests[1].messages.map((message) => message.id), ["a3"]);
});

test("canceling a pending sync does not mark unsent user messages as saved", async () => {
  const sync = loadSyncEffect();
  const cleanup = sync.render(messages.slice(0, 1), "ready");
  cleanup?.();
  assert.equal(sync.savedIds.size, 0);
  sync.render(messages.slice(0, 2), "ready");
  await sync.flush();
  assert.deepEqual(sync.requests[0].messages.map((message) => message.id), ["u1", "a1"]);
  assert.equal(sync.savedIds.size, 2);
});

test("failed sync leaves messages available for a later retry", async () => {
  const sync = loadSyncEffect(new Response("Save failed", { status: 500 }));
  sync.render(messages.slice(0, 2), "ready");
  await sync.flush();
  assert.equal(sync.savedIds.size, 0);
  sync.render(messages.slice(0, 2), "ready");
  await sync.flush();
  assert.equal(sync.requests.length, 2);
});
