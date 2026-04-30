import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_TITLE_MAX_CJK_CHARACTERS,
  SESSION_TITLE_MAX_ENGLISH_WORDS,
  SESSION_TITLE_MODEL_ID,
  buildSessionTitlePrompt,
  getOptimisticSessionTitle,
  isSessionTitleTooLong,
  normalizeGeneratedSessionTitle,
  shouldGenerateSessionTitle,
} from "./session-title.ts";

test("session title model is the fast mini model", () => {
  assert.equal(SESSION_TITLE_MODEL_ID, "gpt-5.4-mini");
});

test("session title over-limit detection uses six English words", () => {
  assert.equal(
    isSessionTitleTooLong("one two three four five six"),
    false
  );
  assert.equal(
    isSessionTitleTooLong("one two three four five six seven"),
    true
  );
});

test("session title over-limit detection uses ten Chinese characters", () => {
  assert.equal(isSessionTitleTooLong("设计智能聊天助手"), false);
  assert.equal(isSessionTitleTooLong("设计智能聊天助手并更新搜索信息"), true);
});

test("normalizeGeneratedSessionTitle removes wrappers and enforces the title limit", () => {
  assert.equal(
    normalizeGeneratedSessionTitle(
      '"Design a polished expert AI chat workspace title with attachments"',
      "fallback"
    ),
    "Design a polished expert AI chat"
  );

  assert.equal(
    normalizeGeneratedSessionTitle(
      "设计智能聊天助手品牌标识并更新搜索分享图片",
      "fallback"
    ),
    "设计智能聊天助手品牌"
  );

  assert.ok(
    isSessionTitleTooLong(
      "Design a polished expert AI chat workspace title with attachments"
    ) === true
  );
  assert.equal(SESSION_TITLE_MAX_ENGLISH_WORDS, 6);
  assert.equal(SESSION_TITLE_MAX_CJK_CHARACTERS, 10);
});

test("session title prompt asks for semantic summarization without examples", () => {
  const prompt = buildSessionTitlePrompt(
    "我测试了发现标题只是直接截断了，需要用AI总结内容保持句子含义"
  );

  assert.match(prompt, /semantic summary/i);
  assert.match(prompt, /Do not truncate/i);
  assert.match(prompt, /Maximum 6 English words/);
  assert.match(prompt, /10 Chinese characters/);
  assert.doesNotMatch(prompt, /Examples:/);
  assert.doesNotMatch(prompt, /bad title/i);
  assert.doesNotMatch(prompt, /good title/i);
});

test("optimistic title keeps New chat until the server AI title returns", () => {
  assert.equal(
    getOptimisticSessionTitle("New chat", "short title"),
    "New chat"
  );
  assert.equal(
    getOptimisticSessionTitle(
      "New chat",
      "我刚刚测试发现标题没有调用AI进行语义概括只是直接截断"
    ),
    "New chat"
  );
  assert.equal(
    getOptimisticSessionTitle("Existing title", "short title"),
    "Existing title"
  );
});

test("server title generation only runs for the first user message in a new chat", () => {
  assert.equal(shouldGenerateSessionTitle("New chat", false), true);
  assert.equal(shouldGenerateSessionTitle("New chat", true), false);
  assert.equal(shouldGenerateSessionTitle("Generated title", false), false);
});
