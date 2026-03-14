import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeClipboardFiles,
  shouldPreventClipboardPasteDefault,
} from "./chat-clipboard.ts";

test("normalizeClipboardFiles generates unique filenames for pasted images within a single paste event", () => {
  const files = [
    new File(["a"], "ignored.png", { type: "image/png", lastModified: 1 }),
    new File(["b"], "ignored.png", { type: "image/png", lastModified: 1 }),
  ];

  const normalized = normalizeClipboardFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0]?.name, "pasted-image-20260313-153045-1.png");
  assert.equal(normalized[1]?.name, "pasted-image-20260313-153045-2.png");
});

test("normalizeClipboardFiles preserves filenames for copied documents", () => {
  const files = [
    new File(["report"], "quarterly-report.pdf", {
      type: "application/pdf",
      lastModified: 1,
    }),
  ];

  const normalized = normalizeClipboardFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized[0]?.name, "quarterly-report.pdf");
});

test("normalizeClipboardFiles assigns a generated filename to unnamed pasted documents", () => {
  const files = [
    new File(["invoice"], "", {
      type: "application/pdf",
      lastModified: 1,
    }),
  ];

  const normalized = normalizeClipboardFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized[0]?.name, "pasted-file-20260313-153045-1.pdf");
});

test("normalizeClipboardFiles falls back to .bin when mime type is unknown", () => {
  const files = [new File(["x"], "", { type: "", lastModified: 1 })];

  const normalized = normalizeClipboardFiles(files, {
    now: new Date("2026-03-13T15:30:45.000Z"),
  });

  assert.equal(normalized[0]?.name, "pasted-file-20260313-153045-1.bin");
});

test("shouldPreventClipboardPasteDefault only blocks file-only paste", () => {
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedFiles: true, hasPastedText: false }),
    true
  );
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedFiles: true, hasPastedText: true }),
    false
  );
  assert.equal(
    shouldPreventClipboardPasteDefault({ hasPastedFiles: false, hasPastedText: false }),
    false
  );
});
