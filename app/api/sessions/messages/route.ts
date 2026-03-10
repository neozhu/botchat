import { loadMessagesForSession } from "@/lib/botchat/server-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId")?.trim() ?? "";

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId." }, { status: 400 });
  }

  try {
    const payload = await loadMessagesForSession(sessionId);
    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load session messages.";
    return Response.json({ error: message }, { status: 500 });
  }
}
