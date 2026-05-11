import test from "node:test";
import assert from "node:assert/strict";
import type { UIMessage } from "ai";

import {
  appendSavedConversationSummaryContext,
  buildRollingConversationSummaryPrompt,
  filterSummarizedMessages,
  getChatContextConfig,
  prepareChatModelContext,
  estimateMessagesTokens,
  selectMessagesForPersistentSummary,
} from "./chat-context.ts";

function textMessage(id: string, role: UIMessage["role"], text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

async function withoutChatContextEnv<T>(run: () => T | Promise<T>) {
  const previousTotalTokens = process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS;
  const previousUserMessageCount =
    process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;

  delete process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS;
  delete process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;

  try {
    return await run();
  } finally {
    if (previousTotalTokens === undefined) {
      delete process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS;
    } else {
      process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS = previousTotalTokens;
    }

    if (previousUserMessageCount === undefined) {
      delete process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
    } else {
      process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT =
        previousUserMessageCount;
    }
  }
}

test("getChatContextConfig keeps default compaction thresholds when env vars are absent", () => {
  assert.deepEqual(getChatContextConfig({}), {
    compactAfterTotalTokens: 1_000,
    compactAfterUserMessageCount: 4,
  });
});

test("getChatContextConfig reads positive integer compaction thresholds from env", () => {
  assert.deepEqual(
    getChatContextConfig({
      BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS: "2400",
      BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT: "7",
    }),
    {
      compactAfterTotalTokens: 2_400,
      compactAfterUserMessageCount: 7,
    }
  );
});

test("getChatContextConfig ignores invalid compaction threshold env values", () => {
  assert.deepEqual(
    getChatContextConfig({
      BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS: "0",
      BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT: "not-a-number",
    }),
    {
      compactAfterTotalTokens: 1_000,
      compactAfterUserMessageCount: 4,
    }
  );
});

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

test("prepareChatModelContext summarizes by default when recent context exceeds one thousand estimated tokens", async () => {
  await withoutChatContextEnv(async () => {
    const messages = Array.from({ length: 6 }, (_, index) =>
      textMessage(`m${index + 1}`, index % 2 === 0 ? "user" : "assistant", `message ${index + 1}`)
    );

    const context = await prepareChatModelContext(messages, {
      estimateTokens: () => 1_001,
      summarizeMessages: async () => "Earlier discussion summary.",
    });

    assert.deepEqual(
      context.messages.map((message) => message.id),
      ["m5", "m6"]
    );
    assert.match(context.systemContext ?? "", /Earlier discussion summary/);
  });
});

test("estimateMessagesTokens grows with message text size", () => {
  const short = [textMessage("short", "user", "hello")];
  const long = [textMessage("long", "user", "hello ".repeat(100))];

  assert.ok(estimateMessagesTokens(long) > estimateMessagesTokens(short));
});

test("filterSummarizedMessages removes messages covered by the saved summary", () => {
  const messages = [
    textMessage("m1", "user", "summarized user message"),
    textMessage("m2", "assistant", "summarized assistant message"),
    textMessage("m3", "user", "latest unsummarized message"),
  ];

  const filtered = filterSummarizedMessages(messages, new Set(["m1", "m2"]));

  assert.deepEqual(
    filtered.map((message) => message.id),
    ["m3"]
  );
});

test("appendSavedConversationSummaryContext appends a trimmed persisted summary", () => {
  const context = appendSavedConversationSummaryContext(
    "Existing system context.",
    "  The user chose persistent session summaries.  "
  );

  assert.equal(
    context,
    "Existing system context.\n\nConversation summary before the latest unsummarized messages:\nThe user chose persistent session summaries."
  );
});

test("selectMessagesForPersistentSummary summarizes completed turns when unsummarized tokens reach the threshold", () => {
  return withoutChatContextEnv(() => {
    const messages = [
      { ...textMessage("u1", "user", "user 1"), total_tokens: 0 },
      { ...textMessage("a1", "assistant", "assistant 1"), total_tokens: 650 },
      { ...textMessage("u2", "user", "user 2"), total_tokens: 0 },
      { ...textMessage("a2", "assistant", "assistant 2"), total_tokens: 350 },
    ];

    const selected = selectMessagesForPersistentSummary(messages);

    assert.deepEqual(
      selected.map((message) => message.id),
      ["u1", "a1"]
    );
  });
});

test("prepareChatModelContext uses env user-message compaction threshold by default", async () => {
  const previous = process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
  process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = "5";

  try {
    const messages = [
      textMessage("m1", "user", "first user message"),
      textMessage("m2", "assistant", "first assistant response"),
      textMessage("m3", "user", "second user message"),
      textMessage("m4", "assistant", "second assistant response"),
      textMessage("m5", "user", "third user message"),
      textMessage("m6", "assistant", "third assistant response"),
      textMessage("m7", "user", "fourth user message"),
    ];

    const context = await prepareChatModelContext(messages, {
      maxContextTokens: 12_000,
      estimateTokens: () => 500,
      summarizeMessages: async () => "Earlier discussion summary.",
    });

    assert.equal(context.compacted, false);
  } finally {
    if (previous === undefined) {
      delete process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT;
    } else {
      process.env.BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT = previous;
    }
  }
});

test("selectMessagesForPersistentSummary waits until unsummarized tokens reach the threshold", () => {
  return withoutChatContextEnv(() => {
    const messages = [
      { ...textMessage("u1", "user", "user 1"), total_tokens: 0 },
      { ...textMessage("a1", "assistant", "assistant 1"), total_tokens: 200 },
      { ...textMessage("u2", "user", "user 2"), total_tokens: 0 },
      { ...textMessage("a2", "assistant", "assistant 2"), total_tokens: 200 },
      { ...textMessage("u3", "user", "user 3"), total_tokens: 0 },
      { ...textMessage("a3", "assistant", "assistant 3"), total_tokens: 200 },
      { ...textMessage("u4", "user", "user 4"), total_tokens: 0 },
      { ...textMessage("a4", "assistant", "assistant 4"), total_tokens: 200 },
    ];

    assert.deepEqual(selectMessagesForPersistentSummary(messages), []);
  });
});

test("selectMessagesForPersistentSummary uses env token threshold by default", () => {
  const previous = process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS;
  process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS = "1200";

  try {
    const messages = [
      { ...textMessage("u1", "user", "user 1"), total_tokens: 0 },
      { ...textMessage("a1", "assistant", "assistant 1"), total_tokens: 650 },
      { ...textMessage("u2", "user", "user 2"), total_tokens: 0 },
      { ...textMessage("a2", "assistant", "assistant 2"), total_tokens: 350 },
    ];

    assert.deepEqual(selectMessagesForPersistentSummary(messages), []);
  } finally {
    if (previous === undefined) {
      delete process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS;
    } else {
      process.env.BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS = previous;
    }
  }
});

test("buildRollingConversationSummaryPrompt includes the prior summary and new transcript", () => {
  const prompt = buildRollingConversationSummaryPrompt(
    "The user prefers concise answers.",
    [textMessage("u4", "user", "Continue with implementation.")]
  );

  assert.match(prompt, /Existing rolling summary/);
  assert.match(prompt, /prefers concise answers/);
  assert.match(prompt, /Continue with implementation/);
});

test("buildRollingConversationSummaryPrompt asks for a compact but usable summary without headings", () => {
  const prompt = buildRollingConversationSummaryPrompt(null, [
    textMessage("u1", "user", "Tell a bedtime story for a 7-year-old."),
  ]);

  assert.match(prompt, /240 words or fewer/);
  assert.match(prompt, /Do not use headings/);
  assert.match(prompt, /Do not include labels/);
  assert.doesNotMatch(prompt, /Durable context summary/);
  assert.doesNotMatch(prompt, /Decisions \/ unresolved tasks/);
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
