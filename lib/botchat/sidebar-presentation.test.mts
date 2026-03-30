import test from "node:test";
import assert from "node:assert/strict";
import { getSidebarPresentation } from "./sidebar-presentation.ts";

test("getSidebarPresentation expands mobile icon sidebars into full content mode", () => {
  assert.deepEqual(
    getSidebarPresentation({
      isMobile: true,
      mobileBehavior: "icon",
      collapsible: "icon",
      state: "expanded",
    }),
    {
      collapsibleDataValue: "",
      mobileIconWidthClassName: "w-(--sidebar-width)",
    }
  );
});

test("getSidebarPresentation keeps collapsed mobile icon sidebars in icon mode", () => {
  assert.deepEqual(
    getSidebarPresentation({
      isMobile: true,
      mobileBehavior: "icon",
      collapsible: "icon",
      state: "collapsed",
    }),
    {
      collapsibleDataValue: "icon",
      mobileIconWidthClassName: "w-(--sidebar-width-icon)",
    }
  );
});

test("getSidebarPresentation leaves desktop collapsible behavior unchanged", () => {
  assert.deepEqual(
    getSidebarPresentation({
      isMobile: false,
      mobileBehavior: "icon",
      collapsible: "icon",
      state: "expanded",
    }),
    {
      collapsibleDataValue: "",
      mobileIconWidthClassName: null,
    }
  );
});
