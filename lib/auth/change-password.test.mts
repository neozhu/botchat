import test from "node:test";
import assert from "node:assert/strict";
import { validatePasswordChange } from "./change-password.ts";

test("validatePasswordChange rejects blank passwords", () => {
  assert.deepEqual(validatePasswordChange("", ""), {
    ok: false,
    error: "New password is required.",
  });
});

test("validatePasswordChange rejects mismatched confirmation", () => {
  assert.deepEqual(validatePasswordChange("hunter2", "hunter3"), {
    ok: false,
    error: "Passwords do not match.",
  });
});

test("validatePasswordChange accepts matching passwords", () => {
  assert.deepEqual(validatePasswordChange("hunter2", "hunter2"), {
    ok: true,
    error: null,
  });
});
