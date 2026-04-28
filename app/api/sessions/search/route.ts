import { getCurrentUser } from "@/lib/auth/user";
import { searchSessions } from "@/lib/botchat/server-data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json({ sessions: [] });
  }

  try {
    const sessions = await searchSessions(query);
    return Response.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search sessions.";
    return Response.json({ error: message }, { status: 500 });
  }
}
