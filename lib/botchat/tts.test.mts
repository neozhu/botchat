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
