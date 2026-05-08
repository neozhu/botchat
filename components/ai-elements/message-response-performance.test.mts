import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./message.tsx", import.meta.url), "utf8");

test("message response disables expensive streamdown controls for code and tables", () => {
  assert.match(source, /controls=\{\{\s*code:\s*false,\s*table:\s*false/);
});

test("message response overrides code and table rendering with lightweight components", () => {
  assert.match(source, /optimizedMarkdownComponents/);
  assert.match(source, /LightweightCode/);
  assert.match(source, /LightweightTable/);
  assert.match(source, /components=\{optimizedMarkdownComponents\}/);
});
