import test from "node:test";
import assert from "node:assert/strict";
import { getSidebarChrome } from "./sidebar-chrome.ts";

test("getSidebarChrome uses an overlay sheet and chat trigger on mobile", () => {
  assert.deepEqual(getSidebarChrome(true), {
    mobileBehavior: "sheet",
    showChatTrigger: true,
  });
});

test("getSidebarChrome keeps icon-collapse behavior on desktop", () => {
  assert.deepEqual(getSidebarChrome(false), {
    mobileBehavior: "icon",
    showChatTrigger: false,
  });
});
