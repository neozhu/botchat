import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./message.tsx", import.meta.url), "utf8");

test("message code blocks preserve Shiki token colors", () => {
  assert.match(source, /import\s*{\s*CodeBlock,\s*CodeBlockCopyButton\s*}/);
  assert.match(source, /const MarkdownCode/);
  assert.match(source, /themeMode="dark"/);
  assert.match(source, /components=\{\{[\s\S]*code:\s*MarkdownCode/);
  assert.match(source, /cdnUrl=\{null\}/);
  assert.match(source, /\[&_\[data-streamdown=code-block-body\]\]:!bg-transparent/);
  assert.doesNotMatch(source, /data-streamdown=code-block-body\]_\*\]:!text-white/);
});
