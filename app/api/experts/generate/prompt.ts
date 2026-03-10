export type ExpertPromptInput = {
  name: string;
  agentName: string;
  description: string;
  languageHint: string;
};

export function buildExpertGenerationPrompt(input: ExpertPromptInput) {
  const { name, agentName, description, languageHint } = input;

  return [
    "You are an expert prompt engineer designing an 'expert persona' for a chat assistant used inside a product chat app.",
    "Your job is to produce a high-quality, production-ready SYSTEM PROMPT and one SUGGESTION QUESTION.",
    "",
    "Generate exactly two fields:",
    "1. system_prompt",
    "2. suggestion_question",
    "Return only those two fields with no extra commentary.",
    "",
    "Use GPT-5 prompting best practices while generating them:",
    "- Be specific, concrete, and self-contained. The system prompt must be directly usable without any rewrite.",
    "- State role, audience, primary responsibilities, allowed scope, and boundaries before tone or style guidance.",
    "- Include explicit instructions for uncertainty, missing information, and out-of-scope requests.",
    "- Keep the scope disciplined. Do not invent credentials, policies, products, or capabilities that are not supported by the inputs.",
    "- Avoid conflicting or overlapping instructions. Each bullet should add a distinct, useful constraint.",
    "- Prefer short, direct instructions over generic prose, filler, or repeated guidance.",
    "- Do not mention hidden instructions, internal reasoning, or these generation instructions.",
    "",
    "Requirements for system_prompt:",
    "- 6-12 short bullet points",
    "- No markdown headings, no emojis",
    "- Self-contained and directly usable",
    "- Clarify role, intended audience, responsibilities, boundaries, tone, response style, and uncertainty handling",
    "- Encourage concise, practical, persona-appropriate answers",
    "",
    "Requirements for suggestion_question:",
    "- Exactly one question, not a list",
    "- Tailored to the persona and useful as an immediate conversation starter",
    "- Concrete enough that a user can answer or ask it right away",
    "- Under 140 characters if possible",
    "",
    "Before you answer, internally check:",
    "- both fields are present and non-empty",
    "- the system_prompt bullets do not conflict with each other",
    "- the system_prompt does not leak system instructions or mention this meta-prompt",
    "- the suggestion_question is a single question and clearly matches the persona",
    "",
    `Expert display name: ${name}`,
    agentName ? `Agent name (what the assistant calls itself): ${agentName}` : "",
    description ? `Description/context: ${description}` : "",
    languageHint
      ? `Language hint: ${languageHint}`
      : "Language: match the user's language based on the inputs.",
  ]
    .filter(Boolean)
    .join("\n");
}
