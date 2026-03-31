import test from "node:test";
import assert from "node:assert/strict";
import { getComposerTextareaSizing } from "./chat-composer.ts";

test("getComposerTextareaSizing keeps the composer at a single line by default", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      value: "",
      scrollHeight: 0,
    }),
    {
      height: 24,
      overflowY: "hidden",
    }
  );
});

test("getComposerTextareaSizing grows with wrapped content", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      value: "大家好，Moo'ers。市场又迎来了一个绝佳的时机",
      scrollHeight: 120,
    }),
    {
      height: 120,
      overflowY: "hidden",
    }
  );
});

test("getComposerTextareaSizing caps growth at the existing limit", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      value: "大家好，Moo'ers。市场又迎来了一个绝佳的时机 呲牙".repeat(10),
      scrollHeight: 360,
    }),
    {
      height: 240,
      overflowY: "auto",
    }
  );
});

test("getComposerTextareaSizing collapses back to a single line when content is cleared", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      value: "",
      scrollHeight: 240,
    }),
    {
      height: 24,
      overflowY: "hidden",
    }
  );
});
