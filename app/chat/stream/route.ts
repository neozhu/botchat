import { createChatStreamResponse } from "@/lib/botchat/chat-stream";

export const maxDuration = 30;

export async function POST(request: Request) {
  return createChatStreamResponse(request);
}
