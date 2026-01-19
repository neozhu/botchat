export function getOpenAIModelId() {
  const model = process.env.OPENAI_MODEL?.trim();
  if (!model) {
    throw new Error("Missing required environment variable: OPENAI_MODEL");
  }
  return model;
}

