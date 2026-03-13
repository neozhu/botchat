import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePastedImageFiles,
  shouldPreventClipboardPasteDefault,
} from "./chat-clipboard.ts";

test("normalizePastedImageFiles generates unique filenames within a single paste event", () => {
  const files = [
    new File(["a"], "ignored.png", { type: "image/png", lastModified: 1 }),
    new File(["b"], "ignored.png", { type: "image/png", lastModified: 1 }),
  ];

  const normalized = normalizePastedImageFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0]?.name, "pasted-image-20260313-153045-1.png");
  assert.equal(normalized[1]?.name, "pasted-image-20260313-153045-2.png");
});

test("normalizePastedImageFiles falls back to .bin when mime type is unknown", () => {
  const files = [new File(["x"], "ignored", { type: "", lastModified: 1 })];

  const normalized = normalizePastedImageFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized[0]?.name, "pasted-image-20260313-153045-1.bin");
});

test("shouldPreventClipboardPasteDefault only blocks image-only paste", () => {
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedImages: true, hasPastedText: false }),
    true
  );
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedImages: true, hasPastedText: true }),
    false
  );
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedImages: false, hasPastedText: false }),
    false
  );
});
