type AsrTranscriptionEnv = {
  [key: string]: string | undefined;
  ASR_API_KEY?: string;
  ASR_API_URL?: string;
};

export type AsrTranscriptionConfig = {
  apiKey: string;
  apiUrl: string;
};

export function getAsrTranscriptionConfig(
  env: AsrTranscriptionEnv = process.env
): AsrTranscriptionConfig {
  const apiKey = env.ASR_API_KEY?.trim();
  const apiUrl = env.ASR_API_URL?.trim();

  if (!apiKey) {
    throw new Error("Missing ASR_API_KEY environment variable.");
  }

  if (!apiUrl) {
    throw new Error("Missing ASR_API_URL environment variable.");
  }

  return { apiKey, apiUrl };
}

export function buildAsrTranscriptionRequest(
  file: File,
  config: AsrTranscriptionConfig
) {
  const body = new FormData();
  body.append("file", file);
  body.append("model", "whisper-1");
  body.append("response_format", "json");

  return {
    url: config.apiUrl,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
    },
  };
}
