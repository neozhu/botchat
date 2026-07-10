import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./chat-panel.tsx", import.meta.url), "utf8");

test("assistant message actions include text to speech states", () => {
  assert.match(source, /type SpeechState = "idle" \| "loading" \| "playing"/);
  assert.match(source, /Read response aloud/);
  assert.match(source, /Preparing speech/);
  assert.match(source, /Reading response aloud/);
  assert.match(source, /fetch\("\/api\/audio\/speech"/);
  assert.match(source, /new Audio\(audioUrl\)/);
  assert.match(source, /function SpeechWaveformIcon/);
  assert.match(source, /useReducedMotion\(\)/);
  assert.match(source, /<svg/);
  assert.match(source, /<motion\.path/);
  assert.match(source, /x: \[0, -14\]/);
  assert.match(source, /repeat: Infinity/);
  assert.match(source, /<SpeechWaveformIcon \/>/);
  assert.doesNotMatch(source, /SPEECH_WAVEFORM_BAR_HEIGHTS/);
  assert.doesNotMatch(source, /AudioLines/);
});
