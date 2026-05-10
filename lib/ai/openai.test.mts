import test from "node:test";
import assert from "node:assert/strict";

import { getConversationSummaryModelId, getOpenAIModelId } from "./openai.ts";

test("getOpenAIModelId requires the configured chat model", () => {
  const original = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_MODEL;

  try {
    assert.throws(() => getOpenAIModelId(), /OPENAI_MODEL/);
  } finally {
    if (original === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = original;
    }
  }
});

test("getConversationSummaryModelId uses a dedicated model override when configured", () => {
  const originalChat = process.env.OPENAI_MODEL;
  const originalSummary = process.env.OPENAI_CONVERSATION_SUMMARY_MODEL;
  process.env.OPENAI_MODEL = "chat-model";
  process.env.OPENAI_CONVERSATION_SUMMARY_MODEL = "summary-model";

  try {
    assert.equal(getConversationSummaryModelId(), "summary-model");
  } finally {
    if (originalChat === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = originalChat;
    }
    if (originalSummary === undefined) {
      delete process.env.OPENAI_CONVERSATION_SUMMARY_MODEL;
    } else {
      process.env.OPENAI_CONVERSATION_SUMMARY_MODEL = originalSummary;
    }
  }
});

test("getConversationSummaryModelId falls back to the chat model", () => {
  const originalChat = process.env.OPENAI_MODEL;
  const originalSummary = process.env.OPENAI_CONVERSATION_SUMMARY_MODEL;
  process.env.OPENAI_MODEL = "chat-model";
  delete process.env.OPENAI_CONVERSATION_SUMMARY_MODEL;

  try {
    assert.equal(getConversationSummaryModelId(), "chat-model");
  } finally {
    if (originalChat === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = originalChat;
    }
    if (originalSummary === undefined) {
      delete process.env.OPENAI_CONVERSATION_SUMMARY_MODEL;
    } else {
      process.env.OPENAI_CONVERSATION_SUMMARY_MODEL = originalSummary;
    }
  }
});
