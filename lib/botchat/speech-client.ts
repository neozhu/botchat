import { extractEnglishSpeechText } from "./tts-text.ts";

export async function requestEnglishSpeech(
  text: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch
): Promise<Blob | null> {
  const input = extractEnglishSpeechText(text);
  if (!input) return null;
  signal.throwIfAborted();

  const response = await fetchImpl("/api/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
    signal,
  });
  if (!response.ok) throw new Error(`TTS request failed with status ${response.status}`);
  const blob = await response.blob();
  signal.throwIfAborted();
  return blob;
}
