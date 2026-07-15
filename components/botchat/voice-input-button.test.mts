import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const voiceInputSource = readFileSync(
  new URL("./VoiceInputButton.tsx", import.meta.url),
  "utf8"
);
const chatPanelSource = readFileSync(
  new URL("./chat-panel.tsx", import.meta.url),
  "utf8"
);

test("voice input records audio, transcribes it, and appends the result to the chat draft", () => {
  assert.match(voiceInputSource, /new MediaRecorder\(/);
  assert.match(voiceInputSource, /fetch\("\/api\/audio\/transcriptions"/);
  assert.match(voiceInputSource, /onTranscription\?\./);
  assert.match(chatPanelSource, /<VoiceInputButton[\s\S]*onTranscription=/);
  assert.match(chatPanelSource, /setInput\(input \+ \(input \? " " : ""\) \+ text\)/);
});
