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

test("streaming assistant messages use lightweight text before markdown rendering", () => {
  assert.match(source, /isStreaming\s*:\s*boolean/);
  assert.match(source, /isStreaming\s*&&\s*!\s*isUser/);
  assert.match(source, /whitespace-pre-wrap/);
  assert.match(source, /<MessageResponse/);
  assert.match(source, /isStreaming=\{[\s\S]*status !== "ready"[\s\S]*lastMessage\?\.id/);
});

test("conversation scroll avoids smooth resize work during streaming", () => {
  const conversationSource = readFileSync(
    new URL("../ai-elements/conversation.tsx", import.meta.url),
    "utf8"
  );

  assert.match(conversationSource, /initial="instant"/);
  assert.match(conversationSource, /resize="instant"/);
});
