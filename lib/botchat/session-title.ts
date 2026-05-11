export const SESSION_TITLE_MODEL_ID = "gpt-5.4-mini";
export const SESSION_TITLE_MAX_ENGLISH_WORDS = 8;
export const SESSION_TITLE_MAX_CJK_CHARACTERS = 12;

const CJK_CHARACTER_PATTERN = /[\u3400-\u9fff]/u;
const CJK_CHARACTER_GLOBAL_PATTERN = /[\u3400-\u9fff]/gu;

function compactWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripTitleWrappers(text: string) {
  return text.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "");
}

function englishWords(text: string) {
  return compactWhitespace(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function cjkCharacters(text: string) {
  return text.match(CJK_CHARACTER_GLOBAL_PATTERN) ?? [];
}

function hasCjkCharacters(text: string) {
  return CJK_CHARACTER_PATTERN.test(text);
}

export function isSessionTitleTooLong(text: string) {
  const normalized = compactWhitespace(text);
  if (!normalized) return false;

  if (hasCjkCharacters(normalized)) {
    return cjkCharacters(normalized).length > SESSION_TITLE_MAX_CJK_CHARACTERS;
  }

  return englishWords(normalized).length > SESSION_TITLE_MAX_ENGLISH_WORDS;
}

export function truncateSessionTitleToLimit(text: string) {
  const normalized = compactWhitespace(stripTitleWrappers(text));
  if (!normalized) return "";

  if (hasCjkCharacters(normalized)) {
    return cjkCharacters(normalized)
      .slice(0, SESSION_TITLE_MAX_CJK_CHARACTERS)
      .join("");
  }

  return englishWords(normalized)
    .slice(0, SESSION_TITLE_MAX_ENGLISH_WORDS)
    .join(" ");
}

export function normalizeGeneratedSessionTitle(text: string, fallback: string) {
  const normalized = compactWhitespace(stripTitleWrappers(text));
  const fallbackTitle = truncateSessionTitleToLimit(fallback);
  if (!normalized) return fallbackTitle;
  if (isSessionTitleTooLong(normalized)) {
    return truncateSessionTitleToLimit(normalized) || fallbackTitle;
  }
  return normalized;
}

export function getOptimisticSessionTitle(currentTitle: string, previewText: string) {
  const normalized = compactWhitespace(previewText);
  if (currentTitle !== "New chat" || !normalized) return currentTitle;
  return currentTitle;
}

export function shouldGenerateSessionTitle(
  currentTitle: string | null | undefined,
  hasExistingUserMessages: boolean
) {
  return currentTitle === "New chat" && !hasExistingUserMessages;
}

export function buildSessionTitlePrompt(firstUserMessage: string) {
  return `Create a semantic summary title for this first user message.

Rules:
- Maximum ${SESSION_TITLE_MAX_ENGLISH_WORDS} English words, or ${SESSION_TITLE_MAX_CJK_CHARACTERS} Chinese characters for Chinese titles.
- Preserve the user's main intent and the actual task/topic.
- Do not truncate or copy the beginning of the message.
- Rewrite the meaning into a compact title.
- Return only the title.
- Do not answer the user.
- Do not include quotes, punctuation wrappers, markdown, or explanations.
First user message:
${firstUserMessage}`;
}
