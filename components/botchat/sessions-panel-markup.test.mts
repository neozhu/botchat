import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./sessions-panel.tsx", import.meta.url),
  "utf8"
);

test("settings collapsible renders as the sidebar menu item to preserve valid list markup", () => {
  assert.match(source, /<Collapsible\s+asChild[^>]*className="group\/settings"/);
  assert.match(source, /<Collapsible\s+asChild[\s\S]*?<SidebarMenuItem>/);
  assert.doesNotMatch(source, /<SidebarMenu\s+className="gap-1">\s*<Collapsible\s+(?!asChild)/);
});
