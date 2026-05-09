import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./sessions-panel.tsx", import.meta.url),
  "utf8"
);

test("sessions panel can prefetch session messages before selection", () => {
  assert.match(source, /onPrefetchSession\?: \(session: SessionItem\) => void/);
  assert.match(source, /onPrefetchSession\?\.\(item\)/);
  assert.match(source, /onPrefetchSession\?\.\(session\)/);
  assert.match(source, /onMouseEnter=/);
  assert.match(source, /onFocus=/);
});
