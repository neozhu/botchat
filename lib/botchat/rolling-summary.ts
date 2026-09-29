import { generateText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getConversationSummaryModelId } from "@/lib/ai/openai";
import {
  buildConversationSummaryPrompt,
  selectMessagesForPersistentSummary,
} from "@/lib/botchat/chat-context";

type PersistChatContextSummaryParams = {
  p_session_id: string;
  p_context_summary: string;
  p_summarized_at: string;
  p_message_row_ids: string[] | null;
  p_ui_message_ids: string[] | null;
};

export type ConversationSummaryDatabase = {
  rpc(
    name: "persist_chat_context_summary",
    params: PersistChatContextSummaryParams
  ): PromiseLike<{ error: { message: string } | null }>;
};

type PersistConversationSummaryBatchesOptions<
  TMessage extends Pick<UIMessage, "role"> & { id: string },
> = {
  supabase: ConversationSummaryDatabase;
  sessionId: string;
  messages: TMessage[];
  toUiMessage: (message: TMessage) => UIMessage;
};

export async function persistConversationSummaryBatches<
  TMessage extends Pick<UIMessage, "role"> & { id: string },
>({
  supabase,
  sessionId,
  messages,
  toUiMessage,
}: PersistConversationSummaryBatchesOptions<TMessage>) {
  let remainingMessages = messages;
  let batch = selectMessagesForPersistentSummary(remainingMessages);
  while (batch.length > 0) {
    const { text } = await generateText({
      model: openai(getConversationSummaryModelId()),
      providerOptions: {
        openai: {
          reasoningEffort: "none",
        },
      },
      instructions:
        "You summarize one independent batch of chat messages for storage. Preserve facts, decisions, constraints, and unresolved user intent. Do not answer the user.",
      prompt: buildConversationSummaryPrompt(batch.map(toUiMessage)),
    });

    const summary = text.trim();
    const summarizedAt = new Date().toISOString();
    if (!summary) throw new Error("Empty conversation summary.");

    const { error } = await supabase.rpc("persist_chat_context_summary", {
      p_session_id: sessionId,
      p_context_summary: summary,
      p_summarized_at: summarizedAt,
      p_message_row_ids: batch.map((message) => message.id),
      p_ui_message_ids: null,
    });

    if (error) throw new Error(error.message);

    remainingMessages = remainingMessages.slice(batch.length);
    batch = selectMessagesForPersistentSummary(remainingMessages);
  }
}
