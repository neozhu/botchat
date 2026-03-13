import type { ExpertRow } from "./types.ts";

type ExpertListDropInput = {
  experts: ExpertRow[];
  activeId: string | null;
  overId: string | null;
  selectedExpertId?: string | null;
};

type ExpertListDropResult = {
  experts: ExpertRow[];
  selectedExpertSortOrder: number | null;
};

export function getExpertDragOverlayStyle(width: number | null) {
  if (width === null) return undefined;
  return { width: `${width}px` };
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;

  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;

  next.splice(toIndex, 0, moved);
  return next;
}

function normalizeExpertOrder(rows: ExpertRow[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index }));
}

export function getExpertListDropResult(
  input: ExpertListDropInput
): ExpertListDropResult | null {
  const { experts, activeId, overId, selectedExpertId = null } = input;

  if (!activeId || !overId || activeId === overId) {
    return null;
  }

  const fromIndex = experts.findIndex((expert) => expert.id === activeId);
  const toIndex = experts.findIndex((expert) => expert.id === overId);
  if (fromIndex < 0 || toIndex < 0) {
    return null;
  }

  const nextExperts = normalizeExpertOrder(moveArrayItem(experts, fromIndex, toIndex));

  return {
    experts: nextExperts,
    selectedExpertSortOrder:
      nextExperts.find((expert) => expert.id === selectedExpertId)?.sort_order ?? null,
  };
}
