import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Streamdown } from "streamdown";
import * as quoteText from "../../lib/botchat/blockquote-text.ts";
import * as speechClient from "../../lib/botchat/speech-client.ts";
import * as speechText from "../../lib/botchat/tts-text.ts";
import { cn } from "../../lib/utils.ts";

const require = createRequire(import.meta.url);

function loadQuoteRenderer() {
  const cache = new Map<string, Record<string, unknown>>();
  const actionTexts: string[] = [];
  function load(filename: string): Record<string, unknown> {
    const cached = cache.get(filename);
    if (cached) return cached;
    const source = readFileSync(new URL(filename, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exports: Record<string, unknown> = {};
    cache.set(filename, exports);
    runInNewContext(compiled, {
      exports, console, AbortController,
      require: (name: string) => {
        if (name === "@/lib/utils") return { cn };
        if (name === "@/lib/botchat/blockquote-text") return quoteText;
        if (name === "@/lib/botchat/tts-text") return speechText;
        if (name === "@/lib/botchat/speech-client") return speechClient;
        if (name === "@/components/ui/button") return { Button: (props: React.ComponentProps<"button"> & { variant?: string; size?: string }) => {
          const domProps = { ...props };
          delete domProps.variant;
          delete domProps.size;
          return React.createElement("button", domProps, props.children);
        } };
        if (name === "@/components/botchat/response-actions") {
          const Actions = load("./response-actions.tsx").ResponseActions as React.ComponentType<{ text: string }>;
          return { ResponseActions: (props: { text: string }) => {
            actionTexts.push(props.text);
            return React.createElement(Actions, props);
          } };
        }
        return require(name);
      },
    });
    return exports;
  }
  return { component: load("./assistant-blockquote.tsx").AssistantBlockquote as React.ComponentType, actionTexts };
}

function renderQuotes(markdown: string) {
  const renderer = loadQuoteRenderer();
  const html = renderToStaticMarkup(React.createElement(Streamdown, {
    components: { blockquote: renderer.component },
  }, markdown));
  return { html, actionTexts: renderer.actionTexts };
}

test("each rendered Markdown quote gets actions for its own complete plain text", () => {
  const { html, actionTexts } = renderQuotes("Outside text\n\n> **Hello** [world](https://example.com).\n>\n> 你好，世界。\n\nBetween quotes\n\n> Another quote.");
  assert.deepEqual(actionTexts, ["Hello world.\n\n你好，世界。", "Another quote."]);
  assert.equal((html.match(/aria-label="Copy quote"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-label="Read quote aloud"/g) ?? []).length, 2);
  assert.match(html, /group-hover\/quote:opacity-100/);
  assert.match(html, /group-focus-within\/quote:opacity-100/);
  assert.match(html, /\[@media\(hover:none\)\]:opacity-100/);
});

test("Chinese-only quote disables speech but leaves copy enabled", () => {
  const { html, actionTexts } = renderQuotes("> 这是中文引用。");
  assert.deepEqual(actionTexts, ["这是中文引用。"]);
  const buttons = html.match(/<button\b[^>]*>/g) ?? [];
  const speech = buttons.find((button) => button.includes('aria-label="No English text to read"'));
  const copy = buttons.find((button) => button.includes('aria-label="Copy quote"'));
  assert.ok(speech && /\bdisabled=""/.test(speech));
  assert.ok(copy && !/\bdisabled=/.test(copy));
});

test("nested quotes keep independent text without including toolbar labels", () => {
  const { actionTexts, html } = renderQuotes("> Outer sentence.\n>\n> > Inner sentence.");
  assert.deepEqual(actionTexts, ["Inner sentence.", "Outer sentence.\n\nInner sentence."]);
  assert.equal((html.match(/aria-label="Copy quote"/g) ?? []).length, 2);
});

test("quoted Markdown tables keep readable cell and row boundaries", () => {
  const { actionTexts } = renderQuotes("> | First | Last |\n> | --- | --- |\n> | Ada | Lovelace |\n> | Alan | Turing |");
  assert.deepEqual(actionTexts, ["First\tLast\nAda\tLovelace\nAlan\tTuring"]);
});
