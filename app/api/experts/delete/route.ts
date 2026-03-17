import { revalidateTag } from "next/cache";
import {
  BOTCHAT_EXPERTS_TAG,
  deleteExpertById,
  loadExperts,
} from "@/lib/botchat/server-data";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return Response.json({ error: "Missing expert id." }, { status: 400 });
  }

  try {
    const { deletedSessionIds } = await deleteExpertById(id);
    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");
    const experts = await loadExperts();
    return Response.json({ ok: true, experts, deletedSessionIds });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete expert.";
    return Response.json({ error: message }, { status: 500 });
  }
}

