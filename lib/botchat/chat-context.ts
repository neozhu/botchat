import type { UIMessage } from "ai";

export const RECENT_CHAT_MESSAGE_COUNT = 5;
export const MAX_CHAT_CONTEXT_TOKENS = 5_000;
export const FALLBACK_RECENT_CHAT_MESSAGE_COUNT = 2;

const APPROX_CHARS_PER_TOKEN = 4;

type PrepareChatModelContextOptions = {
  recentMessageCount?: number;
  maxContextTokens?: number;
  fallbackRecentMessageCount?: number;
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

export function buildConversationSummaryPrompt(messages: UIMessage[]): string {
  const transcript = messages
    .map((message, index) => {
      const text = messageText(message);
      return `${index + 1}. ${message.role}: ${text || "[non-text content]"}`;
    })
    .join("\n\n");

  return `Summarize the earlier conversation for a follow-up chat request.

Keep durable context only:
- user goals, constraints, preferences, decisions, and unresolved tasks
- important assistant conclusions or commitments
- file or tool context that later messages may rely on

Omit filler, greetings, repeated phrasing, and transient wording. Keep the summary concise but specific.

Earlier conversation:
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
  const estimateTokens = options.estimateTokens ?? estimateMessagesTokens;

  const recentMessages = messages.slice(-recentMessageCount);
  const estimatedTokens = estimateTokens(recentMessages);

  if (estimatedTokens <= maxContextTokens) {
    return {
      messages: recentMessages,
      estimatedTokens,
      compacted: false,
    };
  }

  const fallbackMessages = messages.slice(-fallbackRecentMessageCount);
  const messagesToSummarize = messages.slice(
    0,
    Math.max(0, messages.length - fallbackMessages.length)
  );

  if (!options.summarizeMessages || messagesToSummarize.length === 0) {
    return {
      messages: fallbackMessages,
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
    messages: fallbackMessages,
    systemContext: summary
      ? `Conversation summary before the latest messages:\n${summary}`
      : undefined,
    estimatedTokens,
    compacted: true,
  };
}
