import test from "node:test";
import assert from "node:assert/strict";
import { getSupabaseEnv } from "./env.ts";

test("returns Supabase env from existing PUBLIC variables", () => {
  const env = getSupabaseEnv({
    PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "publishable-key",
  });

  assert.deepEqual(env, {
    url: "https://example.supabase.co",
    publishableKey: "publishable-key",
  });
});

test("throws when PUBLIC Supabase env vars are missing", () => {
  assert.throws(() => getSupabaseEnv({}), /Missing Supabase env vars/i);
});
