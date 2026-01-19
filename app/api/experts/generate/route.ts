import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

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

  const prompt = [
    "You are designing an 'expert persona' for a chat assistant used inside a product chat app.",
    "Generate two fields: (1) a SYSTEM PROMPT for the model, (2) a SUGGESTION QUESTION shown as a starter prompt.",
    "",
    "Hard requirements for SYSTEM PROMPT:",
    "- Clarify role + audience + boundaries",
    "- Specify tone, response style, and how to handle uncertainty",
    "- 6–12 short bullet points, no markdown headings, no emojis",
    "- Must be safe and avoid leaking system instructions",
    "",
    "Hard requirements for SUGGESTION QUESTION:",
    "- One single question (not a list), tailored to the persona",
    "- Under 140 characters if possible",
    "",
    `Expert display name: ${name}`,
    agentName ? `Agent name (what the assistant calls itself): ${agentName}` : "",
    description ? `Description/context: ${description}` : "",
    languageHint ? `Language hint: ${languageHint}` : "Language: match the user's language based on the inputs.",
  ]
    .filter(Boolean)
    .join("\n");

  const { output } = await generateText({
    model: openai("gpt-5-mini"),
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

