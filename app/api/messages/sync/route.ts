import type { UIMessage } from "ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  const lastText = last ? messageText(last).trim().slice(0, 500) : null;
  const firstUser = messages.find((m) => m.role === "user") ?? null;
  const title = firstUser ? messageText(firstUser).trim().slice(0, 60) : null;

  const rows = messages.map((m) => ({
    session_id: sessionId,
    ui_message_id: m.id,
    role: m.role,
    content: messageText(m),
    parts: (m as UIMessage).parts ?? [],
  }));

  const supabase = createSupabaseAdminClient();

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

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
