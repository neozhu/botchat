import test from "node:test";
import assert from "node:assert/strict";
import { summarizeExpertTokenUsage } from "./expert-token-usage.ts";

test("sums session usage by expert and calculates shares", () => {
  assert.deepEqual(
    summarizeExpertTokenUsage(
      [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }, { id: "c", name: "Unused" }],
      [{ expert_id: "a", total_tokens: 100 }, { expert_id: "b", total_tokens: 200 }, { expert_id: "a", total_tokens: 100 }]
    ),
    { total: 400, experts: [{ id: "a", name: "Alpha", tokens: 200, share: 0.5 }, { id: "b", name: "Beta", tokens: 200, share: 0.5 }] }
  );
});

test("reports an empty distribution when there is no recorded usage", () => {
  assert.deepEqual(summarizeExpertTokenUsage([{ id: "a", name: "Alpha" }], []), { total: 0, experts: [] });
});
