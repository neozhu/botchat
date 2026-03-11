import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionInsertPayload } from "./session-payload.ts";

test("buildSessionInsertPayload includes the authenticated owner id", () => {
  assert.deepEqual(
    buildSessionInsertPayload("user-123", "expert-456"),
    {
      user_id: "user-123",
      expert_id: "expert-456",
      title: "New chat",
    }
  );
});
