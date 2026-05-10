import type { UIMessage } from "ai";

export const RECENT_CHAT_MESSAGE_COUNT = 5;
export const MAX_CHAT_CONTEXT_TOKENS = 5_000;
export const FALLBACK_RECENT_CHAT_MESSAGE_COUNT = 2;
export const COMPACT_AFTER_USER_MESSAGE_COUNT = 4;

const APPROX_CHARS_PER_TOKEN = 4;
const SAVED_SUMMARY_CONTEXT_PREFIX =
  "Conversation summary before the latest unsummarized messages:";

type PrepareChatModelContextOptions = {
  recentMessageCount?: number;
  maxContextTokens?: number;
  fallbackRecentMessageCount?: number;
  compactAfterUserMessageCount?: number;
  estimateTokens?: (messages: UIMessage[]) => number;
  summarizeMessages?: (messages: UIMessage[]) => Promise<string>;
};

type PreparedChatModelContext = {
  messages: UIMessage[];
  systemContext?: string;
  estimatedTokens: number;
  compacted: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function partText(part: unknown): string {
  if (!isRecord(part) || typeof part.type !== "string") return "";

  if (part.type === "text" && typeof part.text === "string") {
    return part.text;
  }

  if (part.type === "file") {
    const name = typeof part.filename === "string" ? ` ${part.filename}` : "";
    const mediaType =
      typeof part.mediaType === "string" ? ` (${part.mediaType})` : "";
    return `[file${name}${mediaType}]`;
  }

  if (part.type.startsWith("tool-")) {
    return `[${part.type}]`;
  }

  return "";
}

function messageText(message: UIMessage): string {
  return message.parts.map(partText).filter(Boolean).join(" ").trim();
}

export function estimateMessagesTokens(messages: UIMessage[]): number {
  const serializedChars = JSON.stringify(messages).length;
  return Math.ceil(serializedChars / APPROX_CHARS_PER_TOKEN) + messages.length * 4;
}

function countUserMessages(messages: Pick<UIMessage, "role">[]): number {
  return messages.filter((message) => message.role === "user").length;
}

function formatConversationTranscript(messages: UIMessage[]): string {
  return messages
    .map((message, index) => {
      const text = messageText(message);
      return `${index + 1}. ${message.role}: ${text || "[non-text content]"}`;
    })
    .join("\n\n");
}

export function buildConversationSummaryPrompt(messages: UIMessage[]): string {
  const transcript = formatConversationTranscript(messages);

  return `Summarize the earlier conversation for a follow-up chat request.

Keep durable context only:
- user goals, constraints, preferences, decisions, and unresolved tasks
- important assistant conclusions or commitments
- file or tool context that later messages may rely on

Omit filler, greetings, repeated phrasing, and transient wording. Keep the summary concise but specific.

Earlier conversation:
${transcript}`;
}

export function filterSummarizedMessages(
  messages: UIMessage[],
  summarizedUiMessageIds: ReadonlySet<string>
): UIMessage[] {
  if (summarizedUiMessageIds.size === 0) return messages;
  return messages.filter((message) => !summarizedUiMessageIds.has(message.id));
}

export function buildSavedConversationSummaryContext(
  contextSummary: string | null | undefined
) {
  const summary = contextSummary?.trim();
  if (!summary) return undefined;
  return `${SAVED_SUMMARY_CONTEXT_PREFIX}\n${summary}`;
}

export function appendSavedConversationSummaryContext(
  systemContext: string,
  contextSummary: string | null | undefined
) {
  const summaryContext = buildSavedConversationSummaryContext(contextSummary);
  return summaryContext ? `${systemContext}\n\n${summaryContext}` : systemContext;
}

export function selectMessagesForPersistentSummary<
  TMessage extends Pick<UIMessage, "role">,
>(
  messages: TMessage[],
  compactAfterUserMessageCount = COMPACT_AFTER_USER_MESSAGE_COUNT
): TMessage[] {
  if (countUserMessages(messages) < compactAfterUserMessageCount) return [];

  let latestUserMessageIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserMessageIndex = index;
      break;
    }
  }

  if (latestUserMessageIndex <= 0) return [];
  return messages.slice(0, latestUserMessageIndex);
}

export function buildRollingConversationSummaryPrompt(
  previousSummary: string | null | undefined,
  messages: UIMessage[]
): string {
  const summary = previousSummary?.trim();
  const transcript = formatConversationTranscript(messages);
  const existingSummarySection = summary
    ? `Existing rolling summary:\n${summary}\n\n`
    : "";

  return `Update the rolling conversation summary for future follow-up chat requests.

Write 240 words or fewer. Prefer one compact paragraph; use at most 5 terse bullets only if needed.

Keep only reusable context:
- current user goal and active constraints
- stable preferences or safety requirements
- unresolved request state needed for the next reply
- specific names, files, or decisions that would be costly to lose

Do not use headings. Do not include labels, meta titles, read-time estimates, word counts, completed content inventories, or instructions like "Use this summary". Omit filler, repeated phrasing, and details unlikely to affect the next answer.

${existingSummarySection}New unsummarized conversation:
${transcript}`;
}

export async function prepareChatModelContext(
  messages: UIMessage[],
  options: PrepareChatModelContextOptions = {}
): Promise<PreparedChatModelContext> {
  const recentMessageCount =
    options.recentMessageCount ?? RECENT_CHAT_MESSAGE_COUNT;
  const maxContextTokens = options.maxContextTokens ?? MAX_CHAT_CONTEXT_TOKENS;
  const fallbackRecentMessageCount =
    options.fallbackRecentMessageCount ?? FALLBACK_RECENT_CHAT_MESSAGE_COUNT;
  const compactAfterUserMessageCount =
    options.compactAfterUserMessageCount ?? COMPACT_AFTER_USER_MESSAGE_COUNT;
  const estimateTokens = options.estimateTokens ?? estimateMessagesTokens;

  const estimatedTokens = estimateTokens(messages);
  const shouldCompactByUserMessageCount =
    countUserMessages(messages) >= compactAfterUserMessageCount;

  if (estimatedTokens <= maxContextTokens && !shouldCompactByUserMessageCount) {
    return {
      messages,
      estimatedTokens,
      compacted: false,
    };
  }

  const recentMessages = messages.slice(-recentMessageCount);
  const recentEstimatedTokens = estimateTokens(recentMessages);
  const retainedMessages =
    recentEstimatedTokens <= maxContextTokens
      ? recentMessages
      : messages.slice(-fallbackRecentMessageCount);
  const messagesToSummarize = messages.slice(
    0,
    Math.max(0, messages.length - retainedMessages.length)
  );

  if (!options.summarizeMessages || messagesToSummarize.length === 0) {
    return {
      messages: retainedMessages,
      estimatedTokens,
      compacted: true,
    };
  }

  let summary = "";
  try {
    summary = (await options.summarizeMessages(messagesToSummarize)).trim();
  } catch {
    summary = "";
  }

  return {
    messages: retainedMessages,
    systemContext: summary
      ? `Conversation summary before the latest messages:\n${summary}`
      : undefined,
    estimatedTokens,
    compacted: true,
  };
}
