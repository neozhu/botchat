import test from "node:test";
import assert from "node:assert/strict";
import { getActiveExpertCardDetails } from "./active-expert-card.ts";

test("getActiveExpertCardDetails never exposes system prompt text", () => {
  assert.deepEqual(
    getActiveExpertCardDetails({
      name: "Travel Concierge",
      description: "Helps plan thoughtful itineraries.",
      system_prompt: "Private prompt that should never render.",
    }),
    {
      name: "Travel Concierge",
      description: "Helps plan thoughtful itineraries.",
    }
  );
});

test("getActiveExpertCardDetails falls back to Assistant when expert is missing", () => {
  assert.deepEqual(getActiveExpertCardDetails(null), {
    name: "Assistant",
    description: null,
  });
});
