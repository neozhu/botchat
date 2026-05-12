import type { UIMessage } from "ai";

const CHAT_CONTEXT_DEFAULTS = {
  compactAfterTotalTokens: 1_000,
  compactAfterUserMessageCount: 4,
  savedSummaryContextPrefix:
    "Conversation summary before the latest unsummarized messages:",
} as const;

const CHAT_CONTEXT_ENV = {
  compactAfterTotalTokens: "BOTCHAT_COMPACT_AFTER_TOTAL_TOKENS",
  compactAfterUserMessageCount: "BOTCHAT_COMPACT_AFTER_USER_MESSAGE_COUNT",
} as const;

type PrepareChatModelContextOptions = {
  compactAfterUserMessageCount?: number;
  summarizeMessages?: (messages: UIMessage[]) => Promise<string>;
};

type PreparedChatModelContext = {
  messages: UIMessage[];
  systemContext?: string;
  compacted: boolean;
};

type ChatContextEnv = Record<string, string | undefined>;

export type ChatContextConfig = {
  compactAfterTotalTokens: number;
  compactAfterUserMessageCount: number;
};

function positiveIntegerFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getChatContextConfig(
  env: ChatContextEnv = process.env
): ChatContextConfig {
  return {
    compactAfterTotalTokens: positiveIntegerFromEnv(
      env[CHAT_CONTEXT_ENV.compactAfterTotalTokens],
      CHAT_CONTEXT_DEFAULTS.compactAfterTotalTokens
    ),
    compactAfterUserMessageCount: positiveIntegerFromEnv(
      env[CHAT_CONTEXT_ENV.compactAfterUserMessageCount],
      CHAT_CONTEXT_DEFAULTS.compactAfterUserMessageCount
    ),
  };
}

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
  return `${CHAT_CONTEXT_DEFAULTS.savedSummaryContextPrefix}\n${summary}`;
}

export function appendSavedConversationSummaryContext(
  systemContext: string,
  contextSummary: string | null | undefined
) {
  const summaryContext = buildSavedConversationSummaryContext(contextSummary);
  return summaryContext ? `${systemContext}\n\n${summaryContext}` : systemContext;
}

export function selectMessagesForPersistentSummary<
  TMessage extends Pick<UIMessage, "role"> & {
    total_tokens?: number | null;
  },
>(
  messages: TMessage[],
  compactAfterTotalTokens = getChatContextConfig().compactAfterTotalTokens,
  compactAfterUserMessageCount =
    getChatContextConfig().compactAfterUserMessageCount
): TMessage[] {
  const totalTokens = messages.reduce((sum, message) => {
    const tokens = message.total_tokens ?? 0;
    return Number.isFinite(tokens) && tokens > 0 ? sum + tokens : sum;
  }, 0);
  const shouldCompactByTotalTokens = totalTokens >= compactAfterTotalTokens;
  const shouldCompactByUserMessageCount =
    countUserMessages(messages) >= compactAfterUserMessageCount;

  if (!shouldCompactByTotalTokens && !shouldCompactByUserMessageCount) {
    return [];
  }

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
  const compactAfterUserMessageCount =
    options.compactAfterUserMessageCount ??
    getChatContextConfig().compactAfterUserMessageCount;

  if (countUserMessages(messages) < compactAfterUserMessageCount) {
    return {
      messages,
      compacted: false,
    };
  }

  const retainedMessages = messages.slice(-2);
  const messagesToSummarize = messages.slice(
    0,
    Math.max(0, messages.length - retainedMessages.length)
  );

  if (!options.summarizeMessages || messagesToSummarize.length === 0) {
    return {
      messages: retainedMessages,
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
    compacted: true,
  };
}
