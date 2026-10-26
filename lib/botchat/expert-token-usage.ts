type Expert = { id: string; name: string };
export type ExpertTokenTotal = { expert_id: string; total_tokens: number };

export function summarizeExpertTokenUsage(experts: Expert[], sessions: ExpertTokenTotal[]) {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (Number.isFinite(session.total_tokens) && session.total_tokens > 0) {
      totals.set(session.expert_id, (totals.get(session.expert_id) ?? 0) + session.total_tokens);
    }
  }

  const usedExperts = experts
    .map((expert) => ({ ...expert, tokens: totals.get(expert.id) ?? 0 }))
    .filter((expert) => expert.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);
  const total = usedExperts.reduce((sum, expert) => sum + expert.tokens, 0);
  return {
    total,
    experts: usedExperts.map((expert) => ({ ...expert, share: expert.tokens / total })),
  };
}
