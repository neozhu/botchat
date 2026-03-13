import test from "node:test";
import assert from "node:assert/strict";
import { formatTimelineDay, getTimelineDayKey } from "./chat-timeline.ts";

test("formatTimelineDay uses a stable locale and timezone for hydration-safe labels", () => {
  assert.equal(
    formatTimelineDay(new Date("2026-03-12T00:00:00.000Z")),
    "Thu, Mar 12, 2026"
  );
});

test("getTimelineDayKey groups dates by UTC day instead of local runtime timezone", () => {
  assert.equal(
    getTimelineDayKey(new Date("2026-03-12T23:30:00-05:00")),
    "2026-03-13"
  );
});
