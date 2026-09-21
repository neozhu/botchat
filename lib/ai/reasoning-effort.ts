export type ReasoningEffort = "low" | "high";
export type ExpertReasoningEffort = "none" |"low" | "medium" | "high" | "xhigh" | "max";

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === "high" ? "high" : "low";
}

export function getReasoningEffortFromToggle(
  isHighReasoning: boolean
): ReasoningEffort {
  return isHighReasoning ? "high" : "low";
}

export function normalizeExpertReasoningEffort(
  value: unknown
): ExpertReasoningEffort {
  return value === "none" || value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh" ||
    value ==="max"
    ? value
    : "medium";
}

export function resolveReasoningEffort(
  expertValue: unknown,
  overrideValue: unknown
): ExpertReasoningEffort {
  if (overrideValue === "low" || overrideValue === "high") {
    return overrideValue;
  }
  return normalizeExpertReasoningEffort(expertValue);
}

export function isHighReasoningEffort(value: unknown) {
  return value === "high" || value === "xhigh" || value === "max";
}
