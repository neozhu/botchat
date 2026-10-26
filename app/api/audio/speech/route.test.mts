import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as speechHelpers from "../../../../lib/botchat/tts.ts";

function loadSpeechRoute() {
  const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requests: { url: string; init: RequestInit }[] = [];
  let configReads = 0;
  const routeModule = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  runInNewContext(compiled, {
    exports: routeModule.exports,
    Response,
    Headers,
    console,
    fetch: async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return new Response(new Uint8Array([82, 73, 70, 70]), { headers: { "Content-Type": "audio/wav" } });
    },
    require: (id: string) => {
      if (id === "@/lib/botchat/tts") return {
        ...speechHelpers,
        getTtsSpeechConfig: () => {
          configReads += 1;
          return { apiKey: "test-key", apiUrl: "https://tts.test/speech", voice: "test-voice" };
        },
      };
      throw new Error(`Unexpected speech dependency: ${id}`);
    },
  });
  return { post: routeModule.exports.POST, requests, configReads: () => configReads };
}

function speechRequest(input: string) {
  return new Request("http://localhost/api/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
}

test("speech route forwards only English text and returns the upstream audio", async () => {
  const route = loadSpeechRoute();
  const response = await route.post(speechRequest("早上好！ Good morning! 你好吗？ How are you?"));
  assert.equal(response.status, 200);
  assert.equal(route.requests.length, 1);
  assert.equal(JSON.parse(String(route.requests[0].init.body)).input, "Good morning! How are you?");
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [82, 73, 70, 70]);
});

test("Chinese-only speech input returns 400 without reading config or calling upstream", async () => {
  const route = loadSpeechRoute();
  const response = await route.post(speechRequest("这是中文，不要发给语音接口。"));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /no english/i);
  assert.equal(route.configReads(), 0);
  assert.equal(route.requests.length, 0);
});

test("empty and invalid speech payloads do not call upstream", async () => {
  const route = loadSpeechRoute();
  for (const body of ["not json", "null", "[]", '{}', '{"input":42}', '{"input":"   "}']) {
    const response = await route.post(new Request("http://localhost/api/audio/speech", { method: "POST", body }));
    assert.equal(response.status, 400);
  }
  assert.equal(route.configReads(), 0);
  assert.equal(route.requests.length, 0);
});
