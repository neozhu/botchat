import { generateText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getConversationSummaryModelId } from "@/lib/ai/openai";
import {
  buildRollingConversationSummaryPrompt,
  selectMessagesForPersistentSummary,
} from "@/lib/botchat/chat-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SESSION_TITLE_MODEL_ID,
  buildSessionTitlePrompt,
  normalizeGeneratedSessionTitle,
  shouldGenerateSessionTitle,
  truncateSessionTitleToLimit,
} from "@/lib/botchat/session-title";

export const maxDuration = 30;

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type UnsummarizedMessageRow = {
  id: string;
  ui_message_id: string;
  role: UIMessage["role"];
  parts: unknown;
  created_at: string;
};

function coerceMessages(value: unknown): UIMessage[] {
  return Array.isArray(value) ? (value as UIMessage[]) : [];
}

function messageText(message: UIMessage) {
  const parts = (message as UIMessage).parts ?? [];
  const textParts = parts.filter((part) => part.type === "text");
  if (textParts.length > 0) {
    return textParts
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n\n");
  }
  return (message as { content?: string }).content ?? "";
}

async function buildSessionTitle(titleSource: string) {
  try {
    const { text } = await generateText({
      model: openai(SESSION_TITLE_MODEL_ID),
      providerOptions: {
        openai: {
          reasoningEffort: "none",
        },
      },
      system:
        "You write concise chat session titles. Preserve the user's intent. Do not answer the user.",
      prompt: buildSessionTitlePrompt(titleSource),
    });

    return normalizeGeneratedSessionTitle(text, titleSource);
  } catch {
    return truncateSessionTitleToLimit(titleSource);
  }
}

function rowToUiMessage(row: UnsummarizedMessageRow): UIMessage {
  return {
    id: row.ui_message_id,
    role: row.role,
    parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
  };
}

async function buildPersistentConversationSummary(
  previousSummary: string | null,
  messagesToSummarize: UIMessage[]
) {
  const { text } = await generateText({
    model: openai(getConversationSummaryModelId()),
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
    system:
      "You update a rolling compressed summary of earlier chat history. Preserve facts, decisions, constraints, and unresolved user intent. Do not answer the user.",
    prompt: buildRollingConversationSummaryPrompt(
      previousSummary,
      messagesToSummarize
    ),
  });

  return text.trim();
}

async function persistRollingConversationSummaryIfNeeded(
  supabase: SupabaseServerClient,
  sessionId: string
) {
  const [sessionResult, unsummarizedMessagesResult] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, context_summary")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, ui_message_id, role, parts, created_at")
      .eq("session_id", sessionId)
      .is("summarized_at", null)
      .order("created_at", { ascending: true }),
  ]);

  if (sessionResult.error) throw new Error(sessionResult.error.message);
  if (unsummarizedMessagesResult.error) {
    throw new Error(unsummarizedMessagesResult.error.message);
  }

  const previousSummary =
    typeof sessionResult.data?.context_summary === "string"
      ? sessionResult.data.context_summary
      : null;
  const unsummarizedRows = (unsummarizedMessagesResult.data ?? []).filter(
    (row): row is UnsummarizedMessageRow =>
      typeof row.id === "string" &&
      typeof row.ui_message_id === "string" &&
      (row.role === "user" || row.role === "assistant")
  );
  const rowsToSummarize =
    selectMessagesForPersistentSummary(unsummarizedRows);
  if (rowsToSummarize.length === 0) return null;

  const summary = await buildPersistentConversationSummary(
    previousSummary,
    rowsToSummarize.map(rowToUiMessage)
  );
  if (!summary) return null;

  const summarizedAt = new Date().toISOString();
  const summarizedMessageRowIds = rowsToSummarize.map((row) => row.id);

  const { error: summaryError } = await supabase
    .from("chat_sessions")
    .update({
      context_summary: summary,
      context_summary_updated_at: summarizedAt,
    })
    .eq("id", sessionId);

  if (summaryError) throw new Error(summaryError.message);

  const { error: markerError } = await supabase
    .from("chat_messages")
    .update({ summarized_at: summarizedAt })
    .eq("session_id", sessionId)
    .in("id", summarizedMessageRowIds);

  if (markerError) throw new Error(markerError.message);

  return { summary, summarizedAt };
}

export async function POST(request: Request) {
  const body = await request.json();

  const sessionId =
    typeof body?.sessionId === "string" ? (body.sessionId as string) : null;
  const messages = coerceMessages(body?.messages);

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId." }), {
      status: 400,
    });
  }

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Invalid messages payload." }), {
      status: 400,
    });
  }

  const last = messages[messages.length - 1] ?? null;
  const lastText =
    last?.role === "assistant" ? messageText(last).trim().slice(0, 500) : null;
  const firstUser = messages.find((m) => m.role === "user") ?? null;
  const titleSource = firstUser ? messageText(firstUser).trim() : null;

  const rows = messages.map((m) => ({
    session_id: sessionId,
    ui_message_id: m.id,
    role: m.role,
    content: messageText(m),
    parts: (m as UIMessage).parts ?? [],
  }));

  const supabase = await createSupabaseServerClient();
  let title: string | null = null;

  if (titleSource) {
    const [sessionTitleResult, existingUserMessagesResult] = await Promise.all([
      supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase
        .from("chat_messages")
        .select("id")
        .eq("session_id", sessionId)
        .eq("role", "user")
        .limit(1),
    ]);

    const currentTitle =
      typeof sessionTitleResult.data?.title === "string"
        ? sessionTitleResult.data.title
        : null;
    const hasExistingUserMessages =
      (existingUserMessagesResult.data?.length ?? 0) > 0;

    if (shouldGenerateSessionTitle(currentTitle, hasExistingUserMessages)) {
      title = await buildSessionTitle(titleSource);
    }
  }

  const { error: upsertError } = await supabase
    .from("chat_messages")
    .upsert(rows, { onConflict: "session_id,ui_message_id" });

  if (upsertError) {
    return new Response(
      JSON.stringify({ error: "Failed to persist messages.", details: upsertError.message }),
      { status: 500 }
    );
  }

  const update: Record<string, unknown> = {};
  if (lastText) update.last_message = lastText;
  if (title) update.title = title;

  if (Object.keys(update).length > 0) {
    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .update(update)
      .eq("id", sessionId);

    if (sessionError) {
      return new Response(
        JSON.stringify({ error: "Failed to update session.", details: sessionError.message }),
        { status: 500 }
      );
    }
  }

  try {
    await persistRollingConversationSummaryIfNeeded(supabase, sessionId);
  } catch (error) {
    console.error("Failed to persist conversation summary", error);
  }

  return new Response(
    JSON.stringify({ ok: true, session: { id: sessionId, ...update } }),
    { status: 200 }
  );
}
