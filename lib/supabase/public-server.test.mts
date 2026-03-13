import test from "node:test";
import assert from "node:assert/strict";
import { createSupabasePublicServerClient } from "./public-server.ts";

test("createSupabasePublicServerClient builds a stateless client from public env only", () => {
  const calls: unknown[][] = [];
  const fakeClient = { kind: "supabase-public-client" };

  const client = createSupabasePublicServerClient({
    env: {
      PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "publishable-key",
    },
    createClientImpl: (...args: unknown[]) => {
      calls.push(args);
      return fakeClient;
    },
  });

  assert.equal(client, fakeClient);
  assert.deepEqual(calls, [["https://example.supabase.co", "publishable-key"]]);
});
