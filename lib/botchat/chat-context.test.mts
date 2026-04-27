import test from "node:test";
import assert from "node:assert/strict";
import type { UIMessage } from "ai";

import {
  prepareChatModelContext,
  estimateMessagesTokens,
} from "./chat-context.ts";

function textMessage(id: string, role: UIMessage["role"], text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

test("prepareChatModelContext keeps the latest five messages when they fit the token budget", async () => {
  const messages = Array.from({ length: 7 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );

  const context = await prepareChatModelContext(messages, {
    maxContextTokens: 12_000,
    estimateTokens: () => 500,
  });

  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m3", "m4", "m5", "m6", "m7"]
  );
  assert.equal(context.systemContext, undefined);
});

test("prepareChatModelContext summarizes older messages and keeps the latest two when recent context is too large", async () => {
  const messages = Array.from({ length: 7 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );
  const summarizedIds: string[] = [];

  const context = await prepareChatModelContext(messages, {
    maxContextTokens: 12_000,
    estimateTokens: () => 12_001,
    summarizeMessages: async (messagesToSummarize) => {
      summarizedIds.push(...messagesToSummarize.map((message) => message.id));
      return "The user is comparing context compaction strategies.";
    },
  });

  assert.deepEqual(summarizedIds, ["m1", "m2", "m3", "m4", "m5"]);
  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m6", "m7"]
  );
  assert.match(
    context.systemContext ?? "",
    /Conversation summary before the latest messages/i
  );
  assert.match(context.systemContext ?? "", /context compaction strategies/i);
});

test("prepareChatModelContext summarizes by default when recent context exceeds five thousand estimated tokens", async () => {
  const messages = Array.from({ length: 6 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );

  const context = await prepareChatModelContext(messages, {
    estimateTokens: () => 5_001,
    summarizeMessages: async () => "Earlier discussion summary.",
  });

  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m5", "m6"]
  );
  assert.match(context.systemContext ?? "", /Earlier discussion summary/);
});

test("estimateMessagesTokens grows with message text size", () => {
  const short = [textMessage("short", "user", "hello")];
  const long = [textMessage("long", "user", "hello ".repeat(100))];

  assert.ok(estimateMessagesTokens(long) > estimateMessagesTokens(short));
});

test("prepareChatModelContext falls back to latest two messages when summarization fails", async () => {
  const messages = Array.from({ length: 4 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );

  const context = await prepareChatModelContext(messages, {
    estimateTokens: () => 12_001,
    summarizeMessages: async () => {
      throw new Error("summary failed");
    },
  });

  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m3", "m4"]
  );
  assert.equal(context.systemContext, undefined);
  assert.equal(context.compacted, true);
});
