import test from "node:test";
import assert from "node:assert/strict";
import { shouldSeedExperts } from "./expert-seeding.ts";

test("does not seed experts for unauthenticated requests", () => {
  assert.equal(
    shouldSeedExperts(false, [], ["travel-concierge"]),
    false
  );
});

test("seeds experts for authenticated requests when slugs are missing", () => {
  assert.equal(
    shouldSeedExperts(
      true,
      ["travel-concierge"],
      ["travel-concierge", "product-specialist"]
    ),
    true
  );
});

test("does not seed experts when authenticated requests already have all seed slugs", () => {
  assert.equal(
    shouldSeedExperts(true, [
      "travel-concierge",
      "product-specialist",
      "brand-voice",
      "support-agent",
      "friendly-translator",
    ], [
      "travel-concierge",
      "product-specialist",
      "brand-voice",
      "support-agent",
      "friendly-translator",
    ]),
    false
  );
});
