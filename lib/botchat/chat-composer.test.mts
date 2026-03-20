import test from "node:test";
import assert from "node:assert/strict";
import { getComposerTextareaSizing } from "./chat-composer.ts";

test("getComposerTextareaSizing keeps the mobile composer to a single line", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      scrollHeight: 120,
      viewportWidth: 390,
    }),
    {
      height: 24,
      overflowY: "auto",
    }
  );
});

test("getComposerTextareaSizing preserves desktop autosize behavior", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      scrollHeight: 120,
      viewportWidth: 1280,
    }),
    {
      height: 120,
      overflowY: "hidden",
    }
  );
});

test("getComposerTextareaSizing caps desktop growth at the existing limit", () => {
  assert.deepEqual(
    getComposerTextareaSizing({
      scrollHeight: 360,
      viewportWidth: 1280,
    }),
    {
      height: 240,
      overflowY: "auto",
    }
  );
});
