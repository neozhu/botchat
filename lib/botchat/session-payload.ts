export function buildSessionInsertPayload(userId: string, expertId: string) {
  return {
    user_id: userId,
    expert_id: expertId,
    title: "New chat",
  };
}
