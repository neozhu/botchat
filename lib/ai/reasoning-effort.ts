export type ReasoningEffort = "low" | "high";

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === "high" ? "high" : "low";
}

export function getReasoningEffortFromToggle(
  isHighReasoning: boolean
): ReasoningEffort {
  return isHighReasoning ? "high" : "low";
}
