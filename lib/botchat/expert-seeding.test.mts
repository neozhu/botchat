import test from "node:test";
import assert from "node:assert/strict";
import { shouldSeedExperts } from "./expert-seeding.ts";

test("seeds experts only for an authenticated empty workspace", () => {
  const seeds = ["product-specialist", "travel-concierge"];

  assert.equal(shouldSeedExperts(false, [], seeds), false);
  assert.equal(shouldSeedExperts(true, [], seeds), true);
  assert.equal(shouldSeedExperts(true, ["travel-concierge"], seeds), false);
});
