import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function systemPromptFromJoinRow(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const expert = value.expert;
  if (isRecord(expert) && typeof expert.system_prompt === "string") {
    return expert.system_prompt;
  }
  if (Array.isArray(expert)) {
    const first = expert[0];
    if (isRecord(first) && typeof first.system_prompt === "string") {
      return first.system_prompt;
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  const body = await request.json();
  const messages = await Promise.resolve(body.messages);
  const sessionId: string | undefined = body?.sessionId;
  const expertId: string | undefined = body?.expertId;

  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Invalid messages payload." }),
      { status: 400 }
    );
  }

  let system =
    "You are a premium luggage brand assistant. Be concise, confident, and proactive with tasteful product suggestions.";

  try {
    const supabase = createSupabaseServerClient();
    if (sessionId) {
      const { data } = await supabase
        .from("chat_sessions")
        .select("expert:experts(system_prompt)")
        .eq("id", sessionId)
        .maybeSingle();

      const systemPrompt = systemPromptFromJoinRow(data);
      if (systemPrompt) system = systemPrompt;
    } else if (expertId) {
      const { data } = await supabase
        .from("experts")
        .select("system_prompt")
        .eq("id", expertId)
        .maybeSingle();
      if (isRecord(data) && typeof data.system_prompt === "string") {
        system = data.system_prompt;
      }
    }
  } catch {
    // Fallback to default system prompt if Supabase is unavailable.
  }

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: openai("gpt-5-mini"),
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
