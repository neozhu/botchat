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

export const maxDuration = 30;

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

  return new Response(
    JSON.stringify({ ok: true, session: { id: sessionId, ...update } }),
    { status: 200 }
  );
}
