import {
  buildAsrTranscriptionRequest,
  getAsrTranscriptionConfig,
} from "@/lib/botchat/asr";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing audio file." }, { status: 400 });
  }

  let transcriptionRequest: ReturnType<typeof buildAsrTranscriptionRequest>;
  try {
    transcriptionRequest = buildAsrTranscriptionRequest(
      file,
      getAsrTranscriptionConfig()
    );
  } catch (error) {
    console.error("ASR configuration is incomplete", error);
    return Response.json({ error: "ASR service is not configured." }, { status: 500 });
  }

  const upstreamResponse = await fetch(
    transcriptionRequest.url,
    transcriptionRequest.init
  );

  if (!upstreamResponse.ok) {
    const upstreamError = await upstreamResponse.text().catch(() => "");
    console.error("ASR service request failed", {
      status: upstreamResponse.status,
      error: upstreamError,
    });
    return Response.json({ error: "ASR service request failed." }, { status: 502 });
  }

  const transcription = await upstreamResponse.json().catch(() => null);
  if (
    !transcription ||
    typeof transcription !== "object" ||
    typeof (transcription as { text?: unknown }).text !== "string"
  ) {
    console.error("ASR service returned an invalid transcription response");
    return Response.json({ error: "ASR service returned an invalid response." }, { status: 502 });
  }

  return Response.json({ text: transcription.text.trim() });
}
