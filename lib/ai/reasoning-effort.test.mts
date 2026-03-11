import test from "node:test";
import assert from "node:assert/strict";
import {
  getReasoningEffortFromToggle,
  normalizeReasoningEffort,
} from "./reasoning-effort.ts";

test("normalizeReasoningEffort defaults to low", () => {
  assert.equal(normalizeReasoningEffort(undefined), "low");
  assert.equal(normalizeReasoningEffort(null), "low");
  assert.equal(normalizeReasoningEffort("medium"), "low");
  assert.equal(normalizeReasoningEffort(""), "low");
});

test("normalizeReasoningEffort accepts explicit low and high values", () => {
  assert.equal(normalizeReasoningEffort("low"), "low");
  assert.equal(normalizeReasoningEffort("high"), "high");
});

test("getReasoningEffortFromToggle maps the toolbar toggle to request values", () => {
  assert.equal(getReasoningEffortFromToggle(false), "low");
  assert.equal(getReasoningEffortFromToggle(true), "high");
});
