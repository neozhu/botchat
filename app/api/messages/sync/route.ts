import type { UIMessage } from "ai";
import { syncSessionMessages } from "@/lib/botchat/message-sync";

export const maxDuration = 30;

function coerceMessages(value: unknown): UIMessage[] {
  return Array.isArray(value) ? (value as UIMessage[]) : [];
}

export async function POST(request: Request) {
  const body = await request.json();
  const sessionId =
    typeof body?.sessionId === "string" ? (body.sessionId as string) : null;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId." }), {
      status: 400,
    });
  }

  try {
    const session = await syncSessionMessages({
      sessionId,
      messages: coerceMessages(body?.messages),
    });

    return Response.json({ ok: true, session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to persist messages.";
    return Response.json({ error: message }, { status: 500 });
  }
}
