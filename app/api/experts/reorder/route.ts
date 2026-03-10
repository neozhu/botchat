import { revalidateTag } from "next/cache";
import {
  BOTCHAT_EXPERTS_TAG,
  loadExperts,
  persistExpertOrder,
} from "@/lib/botchat/server-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.items)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const items = body.items
    .map((item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.sort_order === "number"
        ? { id: item.id, sort_order: item.sort_order }
        : null
    )
    .filter(
      (item): item is { id: string; sort_order: number } => item !== null
    );

  if (items.length !== body.items.length) {
    return Response.json({ error: "Invalid reorder payload." }, { status: 400 });
  }

  try {
    await persistExpertOrder(items);
    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");
    const experts = await loadExperts();
    return Response.json({ experts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder experts.";
    return Response.json({ error: message }, { status: 500 });
  }
}
