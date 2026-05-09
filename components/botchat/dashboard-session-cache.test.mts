import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./dashboard.tsx", import.meta.url), "utf8");

test("dashboard caches loaded session messages and reuses cached sessions without blocking on fetch", () => {
  assert.match(source, /type\s+SessionMessageCacheEntry/);
  assert.match(source, /sessionMessageCacheRef/);
  assert.match(source, /sessionMessageRequestRef/);
  assert.match(source, /isSessionMessageCacheStale/);
  assert.match(source, /getCachedSessionMessages/);
  assert.match(source, /loadSessionMessages/);
  assert.match(source, /const\s+cachedSessionMessages\s*=\s*getCachedSessionMessages\(session\)/);
  assert.match(source, /cachedSessionMessages\?\.messages\s*===\s*messages/);
  assert.match(source, /cachedSessionMessages\.messages\.length\s*===\s*0/);
  assert.match(source, /session\.last_message\?\.trim\(\)/);
  assert.match(source, /if\s*\(cachedSessionMessages\)\s*\{[\s\S]*?applySessionMessages\(session\.id,\s*cachedSessionMessages\)/);
  assert.match(source, /onPrefetchSession=\{handlePrefetchSession\}/);
});

test("dashboard does not let transient empty chat state replace loaded session cache", () => {
  assert.match(source, /const\s+renderedMessagesSessionId\s*=\s*messagesSessionIdRef\.current/);
  assert.match(source, /const\s+sessionId\s*=\s*renderedMessagesSessionId/);
  assert.match(source, /const\s+activeSessionMessages\s*=\s*sessionMessageCacheRef\.current\.get\(activeSessionId\)/);
  assert.match(source, /messages\.length\s*===\s*0\s*&&\s*activeSessionMessages\.messages\.length\s*>\s*0/);
  assert.match(
    source,
    /messages\.length\s*===\s*0\s*&&\s*cachedSessionMessages\?\.messages\.length/
  );
});

test("dashboard does not resync unchanged loaded assistant messages on session switch", () => {
  assert.match(source, /function\s+messageFingerprint/);
  assert.match(source, /savedMessageFingerprintsRef/);
  assert.match(
    source,
    /savedMessageFingerprintsRef\.current\.get\(lastAssistant\.id\)\s*!==\s*messageFingerprint\(lastAssistant\)/
  );
});
