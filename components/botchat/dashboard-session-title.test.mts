import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./dashboard-client.tsx", import.meta.url),
  "utf8"
);

test("dashboard waits for server AI title and applies sync response", () => {
  assert.match(source, /getOptimisticSessionTitle/);
  assert.match(source, /const\s+syncPayload\s*=\s*await syncMessagesAction/);
  assert.match(source, /syncPayload\.session/);
  assert.match(source, /last_message:\s*text\.slice\(0,\s*500\)/);
  assert.doesNotMatch(source, /last_message:\s*previewText\.slice\(0,\s*500\)/);
  assert.doesNotMatch(source, /syncMessagesAction[\s\S]*?signal:\s*abort\.signal/);
});

test("dashboard throttles chat stream rendering to keep UI responsive", () => {
  assert.match(source, /experimental_throttle:\s*80/);
});
