import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

test("session search uses only session-level fields including context summary", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./server-data.ts", import.meta.url)),
    "utf8"
  );
  const searchFunction = source.slice(
    source.indexOf("export async function searchSessions"),
    source.indexOf("export const loadMessagesForSession")
  );

  assert.match(searchFunction, /context_summary/);
  assert.match(
    searchFunction,
    /title\.ilike\.\$\{like\},last_message\.ilike\.\$\{like\},context_summary\.ilike\.\$\{like\}/
  );
  assert.doesNotMatch(searchFunction, /\.from\("chat_messages"\)/);
});
