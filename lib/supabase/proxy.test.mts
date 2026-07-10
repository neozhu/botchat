import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("proxy validates the auth session with getClaims", async () => {
  const source = await readFile(new URL("./proxy.ts", import.meta.url), "utf8");

  assert.match(source, /await supabase\.auth\.getClaims\(\)/);
  assert.doesNotMatch(source, /await supabase\.auth\.getUser\(\)/);
});
