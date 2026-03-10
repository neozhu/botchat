import { createSessionForExpert } from "@/lib/botchat/server-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const expertId =
    typeof body.expertId === "string" ? body.expertId.trim() : "";
  if (!expertId) {
    return Response.json({ error: "Missing expertId." }, { status: 400 });
  }

  try {
    const session = await createSessionForExpert(expertId);
    return Response.json({ session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session.";
    return Response.json({ error: message }, { status: 500 });
  }
}
