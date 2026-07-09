type TtsSpeechEnv = {
  [key: string]: string | undefined;
  TTS_API_KEY?: string;
  TTS_API_URL?: string;
  TTS_VOICE?: string;
};

export type TtsSpeechConfig = {
  apiKey: string;
  apiUrl: string;
  voice: string;
};

export function getTtsSpeechConfig(env: TtsSpeechEnv = process.env): TtsSpeechConfig {
  const apiKey = env.TTS_API_KEY?.trim();
  const apiUrl = env.TTS_API_URL?.trim();
  const voice = env.TTS_VOICE?.trim();

  if (!apiKey) {
    throw new Error("Missing TTS_API_KEY environment variable.");
  }

  if (!apiUrl) {
    throw new Error("Missing TTS_API_URL environment variable.");
  }

  if (!voice) {
    throw new Error("Missing TTS_VOICE environment variable.");
  }

  return { apiKey, apiUrl, voice };
}

export function buildTtsSpeechRequest(input: string, config: TtsSpeechConfig) {
  return {
    url: config.apiUrl,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: input.trim(),
        voice: config.voice,
        speed: 1,
        lang: "en-us",
        response_format: "wav",
      }),
    },
  };
}
