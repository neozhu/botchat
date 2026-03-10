import { revalidateTag } from "next/cache";
import {
  BOTCHAT_EXPERTS_TAG,
  loadExperts,
  saveExpert,
} from "@/lib/botchat/server-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  try {
    const experts = await loadExperts();
    return Response.json({ experts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load experts.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const agentName =
    typeof body.agent_name === "string" ? body.agent_name.trim() : "";
  const systemPrompt =
    typeof body.system_prompt === "string" ? body.system_prompt.trim() : "";
  if (!name || !agentName || !systemPrompt) {
    return Response.json(
      { error: "Name / Agent name / System prompt are required." },
      { status: 400 }
    );
  }

  try {
    await saveExpert({
      id: typeof body.id === "string" ? body.id : undefined,
      slug: typeof body.slug === "string" ? body.slug.trim() : "",
      name,
      agent_name: agentName,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      system_prompt: systemPrompt,
      suggestion_question:
        typeof body.suggestion_question === "string" &&
        body.suggestion_question.trim()
          ? body.suggestion_question.trim()
          : null,
      sort_order:
        typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
          ? body.sort_order
          : 0,
    });

    revalidateTag(BOTCHAT_EXPERTS_TAG, "max");

    const experts = await loadExperts();
    return Response.json({ experts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save expert.";
    return Response.json({ error: message }, { status: 500 });
  }
}
