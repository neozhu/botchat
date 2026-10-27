import test from "node:test";
import assert from "node:assert/strict";
import * as speechClient from "./speech-client.ts";

test("speech client sends only the current quote's English to the existing endpoint", async () => {
  const signal = new AbortController().signal;
  const audio = new Blob(["audio"], { type: "audio/wav" });
  const result = await speechClient.requestEnglishSpeech("Hello world.\n你好，世界。", signal, async (url, init) => {
    assert.equal(url, "/api/audio/speech");
    assert.equal(init?.method, "POST");
    assert.equal(init?.signal, signal);
    assert.deepEqual(JSON.parse(String(init?.body)), { input: "Hello world." });
    return new Response(audio);
  });
  assert.equal(await result?.text(), "audio");
});

test("Chinese-only or empty quote text never calls the speech API", async () => {
  let requests = 0;
  for (const text of ["你好，世界。", "", "123 😊"]) {
    const result = await speechClient.requestEnglishSpeech(text, new AbortController().signal, async () => {
      requests += 1;
      throw new Error("Must not fetch");
    });
    assert.equal(result, null);
  }
  assert.equal(requests, 0);
});

test("speech client preserves HTTP failures and abort errors", async () => {
  await assert.rejects(speechClient.requestEnglishSpeech("Hello", new AbortController().signal, async () => new Response("Failed", { status: 502 })), /502/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(speechClient.requestEnglishSpeech("Hello", controller.signal, async (_url, init) => {
    init?.signal?.throwIfAborted();
    throw new Error("unreachable");
  }), { name: "AbortError" });
});
