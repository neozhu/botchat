import test from "node:test";
import assert from "node:assert/strict";
import * as quoteText from "./blockquote-text.ts";

const text = (value: string) => ({ type: "text", value });
const element = (tagName: string, ...children: ReturnType<typeof text>[]): quoteText.QuoteTextNode => ({ type: "element", tagName, children });

test("quote text preserves paragraph breaks and all Chinese and English content", () => {
  const node = { type: "element", tagName: "blockquote", children: [element("p", text("Hello world.")), element("p", text("你好，世界。"))] };
  assert.equal(quoteText.getBlockquoteText(node), "Hello world.\n\n你好，世界。");
});

test("quote text uses formatted text and link labels without markup or URLs", () => {
  const node = { type: "element", tagName: "blockquote", children: [{ type: "element", tagName: "p", children: [text("Read "), element("strong", text("this")), text(" "), element("a", text("guide")), text("."), element("br"), text("Next line")] }] };
  assert.equal(quoteText.getBlockquoteText(node), "Read this guide.\nNext line");
});

test("nested quote content is retained without flattening its words together", () => {
  const node = { type: "element", tagName: "blockquote", children: [element("p", text("Outer")), { type: "element", tagName: "blockquote", children: [element("p", text("Inner"))] }, element("p", text("End"))] };
  assert.equal(quoteText.getBlockquoteText(node), "Outer\n\nInner\n\nEnd");
});

test("quote text handles lists, code lines, and comments", () => {
  const node = { type: "element", tagName: "blockquote", children: [{ type: "comment", value: "not visible" }, { type: "element", tagName: "ul", children: [element("li", text("One")), element("li", text("Two"))] }, element("pre", text("first\n  second\n"))] };
  assert.equal(quoteText.getBlockquoteText(node), "One\nTwo\n\nfirst\n  second");
});

test("quote text derives current streamed content without mutating the AST", () => {
  const node = { type: "element", tagName: "blockquote", children: [element("p", text("Hello"))] };
  assert.equal(quoteText.getBlockquoteText(node), "Hello");
  node.children.push(element("p", text("More text")));
  const original = structuredClone(node);
  assert.equal(quoteText.getBlockquoteText(node), "Hello\n\nMore text");
  assert.deepEqual(node, original);
  assert.equal(quoteText.getBlockquoteText(undefined), "");
});
