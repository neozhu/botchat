import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAsrTranscriptionRequest,
  getAsrTranscriptionConfig,
} from "./asr.ts";

test("getAsrTranscriptionConfig requires the ASR endpoint and key", () => {
  assert.throws(
    () => getAsrTranscriptionConfig({ ASR_API_KEY: "key" }),
    /ASR_API_URL/
  );
});

test("buildAsrTranscriptionRequest prepares an OpenAI-compatible upload", async () => {
  const file = new File(["audio"], "voice-input.webm", { type: "audio/webm" });
  const request = buildAsrTranscriptionRequest(file, {
    apiKey: "secret",
    apiUrl: "https://asr.test/v1/audio/transcriptions",
  });

  assert.equal(request.url, "https://asr.test/v1/audio/transcriptions");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer secret");
  assert.equal(request.init.body.get("file"), file);
  assert.equal(request.init.body.get("model"), "whisper-1");
  assert.equal(request.init.body.get("response_format"), "json");
});
