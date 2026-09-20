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

test("session delete action overlays the item without reserving content width", () => {
  const sessionButton = source.match(
    /<SidebarMenuButton[\s\S]*?<\/SidebarMenuButton>/
  )?.[0];

  assert.ok(sessionButton);
  assert.doesNotMatch(sessionButton, /\bpr-10\b/);
});

test("session delete action is revealed by hover or keyboard focus only", () => {
  const deleteLabelIndex = source.indexOf('aria-label="Delete session"');
  const deleteButtonStart = source.lastIndexOf("<Button", deleteLabelIndex);
  const deleteButtonEnd = source.indexOf("</Button>", deleteLabelIndex);
  const deleteButton = source.slice(deleteButtonStart, deleteButtonEnd);

  assert.notEqual(deleteLabelIndex, -1);
  assert.notEqual(deleteButtonStart, -1);
  assert.notEqual(deleteButtonEnd, -1);
  assert.match(deleteButton, /group-hover\/session-item:opacity-100/);
  assert.match(deleteButton, /group-focus-within\/session-item:opacity-100/);
  assert.doesNotMatch(deleteButton, /activeSessionId[\s\S]*?opacity-100/);
});
