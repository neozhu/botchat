import { generateText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getConversationSummaryModelId } from "@/lib/ai/openai";
import {
  buildRollingConversationSummaryPrompt,
  selectMessagesForPersistentSummary,
} from "@/lib/botchat/chat-context";

type RollingSummaryMarkerColumn = "id" | "ui_message_id";

type RollingSummaryMessage = Pick<UIMessage, "role"> & {
  total_tokens?: number | null;
};

type PersistChatContextSummaryParams = {
  p_session_id: string;
  p_context_summary: string;
  p_summarized_at: string;
  p_message_row_ids: string[] | null;
  p_ui_message_ids: string[] | null;
};

export type RollingSummaryDatabase = {
  rpc(
    name: "persist_chat_context_summary",
    params: PersistChatContextSummaryParams
  ): PromiseLike<{ error: { message: string } | null }>;
};

type PersistRollingConversationSummaryOptions<
  TMessage extends RollingSummaryMessage,
> = {
  supabase: RollingSummaryDatabase;
  sessionId: string;
  previousSummary: string | null;
  messages: TMessage[];
  markerColumn: RollingSummaryMarkerColumn;
  getMarkerKey: (message: TMessage) => string;
  toUiMessage: (message: TMessage) => UIMessage;
};

export async function persistRollingConversationSummary<
  TMessage extends RollingSummaryMessage,
>({
  supabase,
  sessionId,
  previousSummary,
  messages,
  markerColumn,
  getMarkerKey,
  toUiMessage,
}: PersistRollingConversationSummaryOptions<TMessage>) {
  const messagesToSummarize = selectMessagesForPersistentSummary(messages);
  if (messagesToSummarize.length === 0) {
    return {
      summary: previousSummary,
      summarizedAt: null,
      summarizedMessageKeys: [],
    };
  }

  const { text } = await generateText({
    model: openai(getConversationSummaryModelId()),
    providerOptions: {
      openai: {
        reasoningEffort: "none",
      },
    },
    instructions:
      "You update a rolling compressed summary of earlier chat history. Preserve facts, decisions, constraints, and unresolved user intent. Do not answer the user.",
    prompt: buildRollingConversationSummaryPrompt(
      previousSummary,
      messagesToSummarize.map(toUiMessage)
    ),
  });

  const summary = text.trim();
  const summarizedAt = new Date().toISOString();
  const summarizedMessageKeys = messagesToSummarize.map(getMarkerKey);

  const { error } = await supabase.rpc("persist_chat_context_summary", {
    p_session_id: sessionId,
    p_context_summary: summary,
    p_summarized_at: summarizedAt,
    p_message_row_ids:
      markerColumn === "id" ? summarizedMessageKeys : null,
    p_ui_message_ids:
      markerColumn === "ui_message_id" ? summarizedMessageKeys : null,
  });

  if (error) throw new Error(error.message);

  return { summary, summarizedAt, summarizedMessageKeys };
}
