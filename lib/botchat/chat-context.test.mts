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

test("prepareChatModelContext keeps the full conversation when it fits the token budget", async () => {
  const messages = Array.from({ length: 6 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );

  const context = await prepareChatModelContext(messages, {
    maxContextTokens: 12_000,
    estimateTokens: () => 500,
  });

  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m1", "m2", "m3", "m4", "m5", "m6"]
  );
  assert.equal(context.systemContext, undefined);
});

test("prepareChatModelContext summarizes older messages when the full conversation is over budget even if recent messages fit", async () => {
  const messages = Array.from({ length: 8 }, (_, index) =>
    textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
  );
  const summarizedIds: string[] = [];

  const context = await prepareChatModelContext(messages, {
    maxContextTokens: 1_000,
    estimateTokens: (messagesToEstimate) =>
      messagesToEstimate.length === messages.length ? 1_001 : 500,
    summarizeMessages: async (messagesToSummarize) => {
      summarizedIds.push(...messagesToSummarize.map((message) => message.id));
      return "The user prefers durable constraints from earlier turns.";
    },
  });

  assert.deepEqual(summarizedIds, ["m1", "m2", "m3"]);
  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m4", "m5", "m6", "m7", "m8"]
  );
  assert.match(context.systemContext ?? "", /durable constraints/i);
  assert.equal(context.compacted, true);
});

test("prepareChatModelContext summarizes after the fourth user message even when the conversation is under budget", async () => {
  const messages = [
    textMessage("m1", "user", "first user message"),
    textMessage("m2", "assistant", "first assistant response"),
    textMessage("m3", "user", "second user message"),
    textMessage("m4", "assistant", "second assistant response"),
    textMessage("m5", "user", "third user message"),
    textMessage("m6", "assistant", "third assistant response"),
    textMessage("m7", "user", "fourth user message"),
  ];
  const summarizedIds: string[] = [];

  const context = await prepareChatModelContext(messages, {
    maxContextTokens: 12_000,
    estimateTokens: () => 500,
    summarizeMessages: async (messagesToSummarize) => {
      summarizedIds.push(...messagesToSummarize.map((message) => message.id));
      return "The first exchange established durable context.";
    },
  });

  assert.deepEqual(summarizedIds, ["m1", "m2"]);
  assert.deepEqual(
    context.messages.map((message) => message.id),
    ["m3", "m4", "m5", "m6", "m7"]
  );
  assert.match(context.systemContext ?? "", /first exchange/i);
  assert.equal(context.compacted, true);
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
