export function getOpenAIModelId() {
  const model = process.env.OPENAI_MODEL?.trim();
  if (!model) {
    throw new Error("Missing required environment variable: OPENAI_MODEL");
  }
  return model;
}

export function getConversationSummaryModelId() {
  return process.env.OPENAI_CONVERSATION_SUMMARY_MODEL?.trim() || getOpenAIModelId();
}
