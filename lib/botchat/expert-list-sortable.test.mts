import test from "node:test";
import assert from "node:assert/strict";
import {
  getExpertDragOverlayStyle,
  getExpertListDropResult,
} from "./expert-list-sortable.ts";
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

test("getExpertListDropResult returns null for no-op drops", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 4 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 7 }),
  ];

  assert.equal(
    getExpertListDropResult({
      experts,
      activeId: "expert-1",
      overId: "expert-1",
      selectedExpertId: "expert-1",
    }),
    null
  );
});

test("getExpertListDropResult returns reordered experts with normalized sort_order values", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 9 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 3 }),
    createExpert({ id: "expert-3", name: "Finance Planner", slug: "finance-planner", sort_order: 12 }),
  ];

  assert.deepEqual(
    getExpertListDropResult({
      experts,
      activeId: "expert-3",
      overId: "expert-1",
      selectedExpertId: null,
    }),
    {
      experts: [
        createExpert({
          id: "expert-3",
          name: "Finance Planner",
          slug: "finance-planner",
          sort_order: 0,
        }),
        createExpert({ id: "expert-1", sort_order: 1 }),
        createExpert({
          id: "expert-2",
          name: "Career Coach",
          slug: "career-coach",
          sort_order: 2,
        }),
      ],
      selectedExpertSortOrder: null,
    }
  );
});

test("getExpertListDropResult returns the selected expert sort_order after drop-time reorder", () => {
  const experts = [
    createExpert({ id: "expert-1", sort_order: 0 }),
    createExpert({ id: "expert-2", name: "Career Coach", slug: "career-coach", sort_order: 1 }),
    createExpert({ id: "expert-3", name: "Finance Planner", slug: "finance-planner", sort_order: 2 }),
  ];

  assert.deepEqual(
    getExpertListDropResult({
      experts,
      activeId: "expert-1",
      overId: "expert-3",
      selectedExpertId: "expert-3",
    }),
    {
      experts: [
        createExpert({
          id: "expert-2",
          name: "Career Coach",
          slug: "career-coach",
          sort_order: 0,
        }),
        createExpert({
          id: "expert-3",
          name: "Finance Planner",
          slug: "finance-planner",
          sort_order: 1,
        }),
        createExpert({ id: "expert-1", sort_order: 2 }),
      ],
      selectedExpertSortOrder: 1,
    }
  );
});

test("getExpertDragOverlayStyle uses the measured row width for stable overlay positioning", () => {
  assert.deepEqual(getExpertDragOverlayStyle(336), { width: "336px" });
  assert.equal(getExpertDragOverlayStyle(null), undefined);
});
