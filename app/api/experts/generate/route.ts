import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { getOpenAIModelId } from "@/lib/ai/openai";
import { z } from "zod";
import { buildExpertGenerationPrompt } from "@/lib/botchat/expert-generation-prompt";

export const maxDuration = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const agentName = typeof body.agent_name === "string" ? body.agent_name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const languageHint =
    typeof body.languageHint === "string" ? body.languageHint.trim() : "";

  if (!name) {
    return Response.json({ error: "Missing expert name." }, { status: 400 });
  }

  const prompt = buildExpertGenerationPrompt({
    name,
    agentName,
    description,
    languageHint,
  });

  const { output } = await generateText({
    model: openai(getOpenAIModelId()),
    prompt,
    output: Output.object({
      schema: z.object({
        system_prompt: z.string().min(1),
        suggestion_question: z.string().min(1),
      }),
    }),
  });

  return Response.json(output);
}
