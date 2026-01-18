import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();
  const messages = await Promise.resolve(body.messages);
  const presetId = body?.presetId;

  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Invalid messages payload." }),
      { status: 400 }
    );
  }

  const systemPresets: Record<string, string> = {
    "travel-concierge":
      "You are a travel concierge. Deliver premium trip guidance, thoughtful itineraries, and upscale service tone.",
    "product-specialist":
      "You are a product specialist. Be precise, technical when needed, and compare options clearly.",
    "brand-voice":
      "You are the brand voice. Keep responses refined, poetic but practical, and aligned with luxury positioning.",
    "support-agent":
      "You are a support agent. Be calm, empathetic, and focused on resolution steps.",
  };
  const system =
    systemPresets[presetId] ??
    "You are a premium luggage brand assistant. Be concise, confident, and proactive with tasteful product suggestions.";
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: openai("gpt-5-mini"),
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
