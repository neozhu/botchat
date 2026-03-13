import type { ExpertRow } from "./types.ts";

type ExpertIdentity = Pick<ExpertRow, "id" | "name">;

type DuplicateNameInput = {
  id?: string;
  name: string;
};

type ResolveSelectedExpertOptions = {
  preserveEmptySelection?: boolean;
};

const EXPERT_ROW_INTRO_STAGGER_MS = 80;
const EXPERT_ROW_INTRO_DURATION_MS = 420;
const EXPERT_LIST_INTRO_BUFFER_MS = 200;

function normalizeExpertName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveSelectedExpertId(
  experts: ExpertRow[],
  selectedId: string | null,
  options?: ResolveSelectedExpertOptions
) {
  if (selectedId === null && options?.preserveEmptySelection) {
    return null;
  }

  if (selectedId && experts.some((expert) => expert.id === selectedId)) {
    return selectedId;
  }

  return experts[0]?.id ?? null;
}

export function getExpertListIntroTimeoutMs(rowCount: number) {
  if (rowCount <= 0) return 0;

  return (
    Math.max(0, rowCount - 1) * EXPERT_ROW_INTRO_STAGGER_MS +
    EXPERT_ROW_INTRO_DURATION_MS +
    EXPERT_LIST_INTRO_BUFFER_MS
  );
}

export function findExpertNameConflict(
  experts: ExpertIdentity[],
  input: DuplicateNameInput
) {
  const normalizedName = normalizeExpertName(input.name);
  if (!normalizedName) return null;

  return (
    experts.find((expert) => {
      if (input.id && expert.id === input.id) return false;
      return normalizeExpertName(expert.name) === normalizedName;
    }) ?? null
  );
}

export function getDuplicateExpertNameError(
  experts: ExpertIdentity[],
  input: DuplicateNameInput
) {
  const conflict = findExpertNameConflict(experts, input);
  if (!conflict) return null;
  return `An expert named "${conflict.name}" already exists. Choose a different name.`;
}

export function formatExpertSaveError(
  message: string | null | undefined,
  experts: ExpertIdentity[],
  input: DuplicateNameInput
) {
  const duplicateNameError = getDuplicateExpertNameError(experts, input);
  if (duplicateNameError) return duplicateNameError;

  const normalizedMessage = message?.trim();
  if (!normalizedMessage) return "Failed to save expert.";

  if (
    /duplicate key value violates unique constraint/i.test(normalizedMessage) ||
    /duplicate/i.test(normalizedMessage)
  ) {
    return `An expert with this name or slug already exists. Choose a different name.`;
  }

  return normalizedMessage;
}
