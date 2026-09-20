import test from "node:test";
import assert from "node:assert/strict";
import {
  getReasoningEffortFromToggle,
  isHighReasoningEffort,
  normalizeExpertReasoningEffort,
  normalizeReasoningEffort,
  resolveReasoningEffort,
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

test("expert reasoning is preserved until a low or high chat override is set", () => {
  assert.equal(normalizeExpertReasoningEffort(undefined), "medium");
  assert.equal(normalizeExpertReasoningEffort("xhigh"), "xhigh");
  assert.equal(resolveReasoningEffort("xhigh", undefined), "xhigh");
  assert.equal(resolveReasoningEffort("xhigh", "low"), "low");
  assert.equal(isHighReasoningEffort("high"), true);
  assert.equal(isHighReasoningEffort("xhigh"), true);
  assert.equal(isHighReasoningEffort("medium"), false);
});
