import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("message sync summarizes every first user title with the fast mini model", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("./route.ts", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(routeSource, /isSessionTitleTooLong\(titleSource\)/);
  assert.match(routeSource, /shouldGenerateSessionTitle\(/);
  assert.match(routeSource, /\.from\("chat_messages"\)[\s\S]*?\.eq\("role", "user"\)/);
  assert.match(routeSource, /last\?\.role\s*===\s*"assistant"/);
  assert.doesNotMatch(
    routeSource,
    /const\s+lastText\s*=\s*last\s*\?\s*messageText\(last\)/
  );
  assert.match(routeSource, /model:\s*openai\(SESSION_TITLE_MODEL_ID\)/);
  assert.match(routeSource, /reasoningEffort:\s*"none"/);
  assert.match(routeSource, /session:\s*{\s*id:\s*sessionId,\s*\.\.\.update\s*}/);
});
