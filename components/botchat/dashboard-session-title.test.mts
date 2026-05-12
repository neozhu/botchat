import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./dashboard.tsx", import.meta.url), "utf8");

test("dashboard waits for server AI title and applies sync response", () => {
  assert.match(source, /getOptimisticSessionTitle/);
  assert.match(source, /const\s+syncPayload\s*=\s*\(await response\.json\(\)\)/);
  assert.match(source, /syncPayload\.session/);
  assert.match(source, /last_message:\s*text\.slice\(0,\s*500\)/);
  assert.doesNotMatch(source, /last_message:\s*previewText\.slice\(0,\s*500\)/);
  assert.doesNotMatch(
    source,
    /fetch\("\/api\/messages\/sync"[\s\S]*?signal:\s*abort\.signal/
  );
});

test("dashboard sends absolute message order when syncing new rows", () => {
  assert.match(source, /position:\s*messages\.findIndex\(\(m\) => m\.id === message\.id\)/);
  assert.match(source, /messages:\s*toUpsert\.map\(\(message\) => \(\{/);
});
