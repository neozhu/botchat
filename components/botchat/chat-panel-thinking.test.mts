import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./chat-panel.tsx", import.meta.url), "utf8");

test("chat panel hides thinking placeholder once assistant text exists after the latest user message", () => {
  assert.match(source, /lastUserIndex/);
  assert.match(source, /hasAssistantTextAfterLastUser/);
  assert.match(source, /fileParts\.length\s*===\s*0[\s\S]*?return null/);
  assert.doesNotMatch(source, /<AnimatePresence[\s\S]*?shouldShowThinking/);
  assert.doesNotMatch(source, /import\s*{\s*AnimatePresence/);
  assert.match(
    source,
    /role\s*===\s*"assistant"[\s\S]*?messageText\(message\)\.trim\(\)\.length\s*>\s*0/
  );
  assert.match(source, /!\s*hasAssistantTextAfterLastUser/);
});
