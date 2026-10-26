import test from "node:test";
import assert from "node:assert/strict";

import { buildTtsSpeechRequest, getTtsSpeechConfig } from "./tts.ts";

test("getTtsSpeechConfig requires all TTS environment values", () => {
  assert.throws(
    () => getTtsSpeechConfig({ TTS_API_KEY: "key", TTS_API_URL: "https://tts.test" }),
    /TTS_VOICE/
  );
});

test("buildTtsSpeechRequest prepares the configured speech request", async () => {
  const request = buildTtsSpeechRequest(" Hello world ", {
    apiKey: "secret",
    apiUrl: "https://tts.test/v1/audio/speech",
    voice: "af_sarah",
  });

  assert.equal(request.url, "https://tts.test/v1/audio/speech");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer secret");
  assert.equal(request.init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    input: "Hello world",
    voice: "af_sarah",
    speed: 1,
    lang: "en-us",
    response_format: "wav",
  });
});

const speechConfig = { apiKey: "secret", apiUrl: "https://tts.test/v1/audio/speech", voice: "af_sarah" };

for (const [name, input, expected] of [
  ["mixed translation paragraphs", "Good morning!\n早上好！\nHow are you?\n你好吗？", "Good morning! How are you?"],
  ["English inside a Chinese sentence", "请跟读：Hello world! 然后说 Goodbye.", "Hello world! Goodbye."],
  ["adjacent English and Chinese", "Hello你好world世界!", "Hello world!"],
  ["Chinese punctuation", "Hello world。你好世界。Goodbye！再见！", "Hello world. Goodbye!"],
  ["Chinese parenthetical translations", "Hello (你好), world. Good morning（早上好）!", "Hello, world. Good morning!"],
  ["English punctuation and numbers", "I’m fine—thanks! Version 2.1 costs $12.50.", "I’m fine—thanks! Version 2.1 costs $12.50."],
  ["extended Chinese characters", "你好𠮷𠀀 English 𰻞再见", "English"],
  ["formatted English and link labels", "**Hello**（你好）\n[Read more](https://example.com/中文)", "Hello Read more"],
  ["English loanwords", "Let’s meet at the café. 我们在咖啡馆见。", "Let’s meet at the café."],
] as const) {
  test(`speech request includes only English from ${name}`, () => {
    const request = buildTtsSpeechRequest(input, speechConfig);
    assert.equal(JSON.parse(request.init.body).input, expected);
  });
}

for (const input of ["你好，这是纯中文回复。", "中文 12345！？", "𠮷𠀀𰻞", "😊 123", "   "]) {
  test(`speech request rejects content without English: ${input}`, () => {
    assert.throws(() => buildTtsSpeechRequest(input, speechConfig), /no english/i);
  });
}
