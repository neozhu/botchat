import test from "node:test";
import assert from "node:assert/strict";
import {
  getAuthScreen,
  type AuthScreenMode,
} from "./auth-view-state.ts";

test("defaults to sign-in when there is no sign-up confirmation state", () => {
  assert.equal(
    getAuthScreen(
      "sign-in",
      {
        error: null,
        success: null,
        pendingEmail: null,
      },
      false
    ),
    "sign-in"
  );
});

test("switches to check-email after sign-up succeeds", () => {
  assert.equal(
    getAuthScreen(
      "sign-up",
      {
        error: null,
        success: "Check your email",
        pendingEmail: "neo@example.com",
      },
      false
    ),
    "check-email"
  );
});

test("returns to explicit user-selected mode after check-email is dismissed", () => {
  const dismissedMode: AuthScreenMode = "sign-in";

  assert.equal(
    getAuthScreen(
      dismissedMode,
      {
        error: null,
        success: "Check your email",
        pendingEmail: "neo@example.com",
      },
      true
    ),
    "sign-in"
  );
});
