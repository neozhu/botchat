import test from "node:test";
import assert from "node:assert/strict";
import {
  getExpertListIntroTimeoutMs,
  getExpertRowIntroStyle,
  getDuplicateExpertNameError,
  resolveExpertDialogState,
  resolveSelectedExpertId,
} from "./expert-settings.ts";
import type { ExpertRow } from "./types.ts";

function createExpert(overrides: Partial<ExpertRow>): ExpertRow {
  return {
    id: "expert-1",
    slug: "travel-concierge",
    name: "Travel Concierge",
    agent_name: "Kate",
    description: null,
    system_prompt: "Help plan travel.",
    suggestion_question: null,
    sort_order: 0,
    created_at: "2026-03-12T00:00:00.000Z",
    ...overrides,
  };
}

test("resolveSelectedExpertId falls back to the first expert when nothing is selected", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 0 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 1 }),
  ];

  assert.equal(resolveSelectedExpertId(experts, null), "expert-1");
});

test("resolveSelectedExpertId preserves an intentional empty selection for new expert drafts", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 0 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 1 }),
  ];

  assert.equal(
    resolveSelectedExpertId(experts, null, { preserveEmptySelection: true }),
    null
  );
});

test("resolveSelectedExpertId preserves the active expert when it still exists", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 0 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 1 }),
  ];

  assert.equal(resolveSelectedExpertId(experts, "expert-2"), "expert-2");
});

test("resolveExpertDialogState prefers externally provided experts when available", () => {
  const currentExperts = [createExpert({ id: "local-expert", name: "Local Expert" })];
  const providedExperts = [
    createExpert({ id: "provided-1", name: "Travel Concierge", sort_order: 0 }),
    createExpert({ id: "provided-2", name: "Career Coach", slug: "career-coach", sort_order: 1 }),
  ];

  assert.deepEqual(
    resolveExpertDialogState({
      currentExperts,
      providedExperts,
      selectedId: "local-expert",
    }),
    {
      experts: providedExperts,
      selectedId: "provided-1",
    }
  );
});

test("resolveExpertDialogState preserves an empty draft selection against provided experts", () => {
  const providedExperts = [
    createExpert({ id: "provided-1", name: "Travel Concierge", sort_order: 0 }),
  ];

  assert.deepEqual(
    resolveExpertDialogState({
      currentExperts: [],
      providedExperts,
      selectedId: null,
      preserveEmptySelection: true,
    }),
    {
      experts: providedExperts,
      selectedId: null,
    }
  );
});

test("getExpertRowIntroStyle returns staggered animation timing for intro rows", () => {
  assert.deepEqual(getExpertRowIntroStyle(2, true), {
    animationDelay: "160ms",
    animationDuration: "420ms",
  });
});

test("getExpertRowIntroStyle disables animation styles when intro is inactive", () => {
  assert.equal(getExpertRowIntroStyle(2, false), undefined);
});

test("getExpertListIntroTimeoutMs covers the final staggered row animation", () => {
  assert.equal(getExpertListIntroTimeoutMs(11), 1420);
});

test("getDuplicateExpertNameError rejects new experts that reuse an existing name", () => {
  const experts = [
    createExpert({ id: "expert-1", name: "Travel Concierge" }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach" }),
  ];

  assert.equal(
    getDuplicateExpertNameError(experts, {
      name: "  travel concierge  ",
    }),
    'An expert named "Travel Concierge" already exists. Choose a different name.'
  );
});

test("getDuplicateExpertNameError allows saving the currently edited expert with the same name", () => {
  const experts = [createExpert({ id: "expert-1", name: "Travel Concierge" })];

  assert.equal(
    getDuplicateExpertNameError(experts, {
      id: "expert-1",
      name: "Travel Concierge",
    }),
    null
  );
});
