import { buildTtsSpeechRequest, getTtsSpeechConfig } from "@/lib/botchat/tts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) {
    return Response.json({ error: "Missing speech input." }, { status: 400 });
  }

  let speechRequest: ReturnType<typeof buildTtsSpeechRequest>;
  try {
    speechRequest = buildTtsSpeechRequest(input, getTtsSpeechConfig());
  } catch (error) {
    console.error("TTS configuration is incomplete", error);
    return Response.json({ error: "TTS service is not configured." }, { status: 500 });
  }

  const upstreamResponse = await fetch(speechRequest.url, speechRequest.init);
  if (!upstreamResponse.ok) {
    const upstreamError = await upstreamResponse.text().catch(() => "");
    console.error("TTS service request failed", {
      status: upstreamResponse.status,
      error: upstreamError,
    });
    return Response.json({ error: "TTS service request failed." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstreamResponse.headers.get("Content-Type") ?? "audio/wav");

  return new Response(upstreamResponse.body, { headers });
}
