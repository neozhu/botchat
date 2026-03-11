type ActiveExpertCardSource = {
  name?: string;
  description?: string | null;
  system_prompt?: string;
} | null;

export function getActiveExpertCardDetails(expert: ActiveExpertCardSource) {
  return {
    name: expert?.name ?? "Assistant",
    description: expert?.description ?? null,
  };
}
