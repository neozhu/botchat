import "server-only";

import { generateText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SESSION_TITLE_MODEL_ID,
  buildSessionTitlePrompt,
  normalizeGeneratedSessionTitle,
  shouldGenerateSessionTitle,
  truncateSessionTitleToLimit,
} from "@/lib/botchat/session-title";

export type SyncedSessionUpdate = {
  id: string;
  title?: string;
  last_message?: string | null;
  updated_at?: string;
};

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

export async function syncSessionMessages({
  sessionId,
  messages,
}: {
  sessionId: string;
  messages: UIMessage[];
}) {
  if (!sessionId) throw new Error("Missing sessionId.");
  if (!Array.isArray(messages)) throw new Error("Invalid messages payload.");

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
    throw new Error(`Failed to persist messages: ${upsertError.message}`);
  }

  const update: Record<string, unknown> = {};
  if (lastText) update.last_message = lastText;
  if (title) update.title = title;

  if (Object.keys(update).length > 0) {
    const { data, error: sessionError } = await supabase
      .from("chat_sessions")
      .update(update)
      .eq("id", sessionId)
      .select("updated_at")
      .maybeSingle();

    if (sessionError) {
      throw new Error(`Failed to update session: ${sessionError.message}`);
    }

    if (typeof data?.updated_at === "string") update.updated_at = data.updated_at;
  }

  return { id: sessionId, ...update } as SyncedSessionUpdate;
}
