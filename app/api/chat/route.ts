import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { normalizeReasoningEffort } from "@/lib/ai/reasoning-effort";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getConversationSummaryModelId,
  getOpenAIModelId,
} from "@/lib/ai/openai";
import {
  appendSavedConversationSummaryContext,
  buildConversationSummaryPrompt,
  filterSummarizedMessages,
  prepareChatModelContext,
} from "@/lib/botchat/chat-context";

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

function getCurrentSystemDateTime() {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return {
    isoDateTime: now.toISOString(),
    formattedDateTime: new Intl.DateTimeFormat("en-CA", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone,
    }).format(now),
    timeZone,
    unixMs: now.getTime(),
  };
}

function getLatestUserText(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!isRecord(message) || message.role !== "user") continue;

    const parts = message.parts;
    if (!Array.isArray(parts)) return "";

    return parts
      .map((part) => {
        if (!isRecord(part) || part.type !== "text") return "";
        return typeof part.text === "string" ? part.text : "";
      })
      .join(" ")
      .trim();
  }

  return "";
}

function shouldForceCurrentSystemDateTimeTool(messages: unknown[]): boolean {
  const latestUserText = getLatestUserText(messages);
  if (!latestUserText) return false;

  return /(?:现在几点|现在时间|当前时间|当前日期|当前时区|今天几号|今天日期|日期时间|系统时间|系统日期|time zone|timezone|current time|current date|current datetime|local time|system time|what(?:'s| is) the time|what(?:'s| is) the date)/iu.test(
    latestUserText
  );
}

function buildCurrentSystemDateTimeContext() {
  const currentDateTime = getCurrentSystemDateTime();

  return `Current server date/time for this request:
- isoDateTime: ${currentDateTime.isoDateTime}
- formattedDateTime: ${currentDateTime.formattedDateTime}
- timeZone: ${currentDateTime.timeZone}
- unixMs: ${currentDateTime.unixMs}

Use this as the authoritative current date/time if the user asks about "now", "today", the current date, the current time, or the current time zone.`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const messages = await Promise.resolve(body.messages);
  const sessionId: string | undefined = body?.sessionId;
  const expertId: string | undefined = body?.expertId;
  const reasoningEffort = normalizeReasoningEffort(body?.reasoningEffort);
  const isWebSearchEnabled = body?.webSearch === true;

  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Invalid messages payload." }),
      { status: 400 }
    );
  }

  let system =
    "You are a premium luggage brand assistant. Be concise, confident, and proactive with tasteful product suggestions.";
  let contextSummary: string | null = null;
  let summarizedUiMessageIds = new Set<string>();

  try {
    const supabase = await createSupabaseServerClient();
    if (sessionId) {
      const [sessionResult, summarizedMessagesResult] = await Promise.all([
        supabase
          .from("chat_sessions")
          .select("expert:experts(system_prompt), context_summary")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("chat_messages")
          .select("ui_message_id")
          .eq("session_id", sessionId)
          .not("summarized_at", "is", null),
      ]);

      const systemPrompt = systemPromptFromJoinRow(sessionResult.data);
      if (systemPrompt) system = systemPrompt;
      if (
        isRecord(sessionResult.data) &&
        typeof sessionResult.data.context_summary === "string"
      ) {
        contextSummary = sessionResult.data.context_summary;
      }
      summarizedUiMessageIds = new Set(
        (summarizedMessagesResult.data ?? [])
          .map((row) =>
            isRecord(row) && typeof row.ui_message_id === "string"
              ? row.ui_message_id
              : null
          )
          .filter((id): id is string => Boolean(id))
      );
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

  system = `${system}\n\nWhen the user asks for the current date, current time, today's date, or the current time zone, call the getCurrentSystemDateTime tool before answering. Do not claim that you cannot access the current time if this tool is available.`;

  const shouldUseCurrentSystemDateTimeTool =
    shouldForceCurrentSystemDateTimeTool(messages);

  if (shouldUseCurrentSystemDateTimeTool) {
    system = `${system}\n\n${buildCurrentSystemDateTimeContext()}`;
  }

  system = appendSavedConversationSummaryContext(system, contextSummary);

  const contextMessages = filterSummarizedMessages(
    messages as UIMessage[],
    summarizedUiMessageIds
  );

  const preparedContext = await prepareChatModelContext(contextMessages, {
    summarizeMessages: async (messagesToSummarize) => {
      const { text } = await generateText({
        model: openai(getConversationSummaryModelId()),
        providerOptions: {
          openai: {
            reasoningEffort: "none",
          },
        },
        system:
          "You compress earlier chat history for a follow-up AI request. Preserve facts, decisions, constraints, and unresolved user intent. Do not answer the user.",
        prompt: buildConversationSummaryPrompt(messagesToSummarize),
      });

      return text;
    },
  });

  if (preparedContext.systemContext) {
    system = `${system}\n\n${preparedContext.systemContext}`;
  }

  const modelMessages = await convertToModelMessages(preparedContext.messages);
  const result = streamText({
    model: openai(getOpenAIModelId()),
    providerOptions: {
      openai: {
        reasoningEffort,
      },
    },
    system,
    messages: modelMessages,
    tools: {
      getCurrentSystemDateTime: tool({
        description:
          "Get the server's current system date, time, and time zone.",
        inputSchema: z.object({}),
        execute: async () => getCurrentSystemDateTime(),
      }),
      ...(isWebSearchEnabled
        ? {
            web_search: openai.tools.webSearch(),
          }
        : {}),
    },
    toolChoice: shouldUseCurrentSystemDateTimeTool
      ? { type: "tool", toolName: "getCurrentSystemDateTime" }
      : undefined,
    stopWhen: stepCountIs(2),
  });

  return result.toUIMessageStreamResponse();
}
